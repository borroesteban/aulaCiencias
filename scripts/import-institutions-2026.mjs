import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const defaultCsvPath = "c:\\Users\\borro\\Downloads\\instituciones_educativas_gualeguaychu_2026.csv";
const csvPath = process.argv.find((arg) => !arg.startsWith("--") && arg.endsWith(".csv")) ?? defaultCsvPath;
const dryRun = process.argv.includes("--dry-run");
const skipGeocode = process.argv.includes("--skip-geocode");
const geocodeDelayMs = Number(process.env.GEOCODE_DELAY_MS ?? 1100);
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://aulaciencias_user:aulaciencias_password@localhost:5434/aulaciencias";
const cachePath = path.join(process.cwd(), "scripts", ".instituciones-2026-geocode-cache.json");

const stopWords = new Set([
  "adultos",
  "colegio",
  "comun",
  "de",
  "del",
  "dr",
  "dra",
  "el",
  "escuela",
  "instituto",
  "jardin",
  "la",
  "las",
  "los",
  "nacional",
  "priv",
  "privada",
  "privado",
  "primaria",
  "secundaria",
  "tecnica",
  "y",
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;

  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] ?? "").trim()])),
  );
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCompact(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanNullable(value) {
  const trimmed = String(value ?? "").replace(/\s+/g, " ").trim();

  if (!trimmed) return null;

  const normalized = normalize(trimmed);
  if (
    normalized === "no informado" ||
    normalized === "no informado en padron" ||
    normalized === "no verificado" ||
    normalized === "sin dato"
  ) {
    return null;
  }

  return trimmed;
}

function cleanWebsite(...values) {
  return values
    .map(cleanNullable)
    .find((value) => value && /^https?:\/\//i.test(value)) ?? null;
}

function displayAddress(rawAddress) {
  const address = cleanNullable(rawAddress);

  if (!address) return null;
  if (/gualeguaych[uú]/i.test(address)) return address;

  return `${address}, Gualeguaychú, Entre Ríos`;
}

function geocodeAddress(rawAddress) {
  const address = cleanNullable(rawAddress);

  if (!address) return null;

  const firstAddress = cleanAddressForGeocoding(address);

  if (!firstAddress) return null;

  return `${firstAddress}, Gualeguaychú, Entre Ríos, Argentina`;
}

function cleanAddressForGeocoding(rawAddress) {
  return String(rawAddress ?? "")
    .split(";")[0]
    .replace(/\bALF\.\s*DE MARINA\s*J\s*M\s*SOBRAL\b/i, "Alferez de Marina Jose Maria Sobral")
    .replace(/\bAVDA\./gi, "Avenida")
    .replace(/\bBV\./gi, "Boulevard")
    .replace(/\bBLVR\./gi, "Boulevard")
    .replace(/\bPTE\./gi, "Presidente")
    .replace(/\bS\/N\b/gi, "")
    .replace(/\bBARRIO\b.*$/i, "")
    .replace(/\bPARADA\b.*$/i, "")
    .replace(/\bSALON(?:\s+DE\s+USOS\s+MULTIPLES)?\b/gi, "")
    .replace(/\bCOMUN\b/gi, "")
    .replace(/\bUTHGRA\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function geocodeQueries(row) {
  const address = cleanNullable(row.direccion);
  const name = cleanNullable(row.institucion);
  const queries = new Set();
  const primaryAddress = geocodeAddress(address);

  if (primaryAddress) {
    queries.add(primaryAddress);
  }

  if (address) {
    const cleanedAddress = cleanAddressForGeocoding(address);
    const firstTokenAddress = cleanedAddress.replace(/\s+\d{1,5}\s*.*$/, "").trim();

    if (cleanedAddress && cleanedAddress !== address) {
      queries.add(`${cleanedAddress}, Gualeguaychú, Entre Ríos, Argentina`);
    }

    if (firstTokenAddress && firstTokenAddress !== cleanedAddress) {
      queries.add(`${firstTokenAddress}, Gualeguaychú, Entre Ríos, Argentina`);
    }
  }

  if (name) {
    queries.add(`${name}, Gualeguaychú, Entre Ríos, Argentina`);
  }

  return [...queries];
}

function sourceDate(row) {
  return row.fuente_principal_url?.includes("2026.01.12") ? "2026-01-12" : "2026-06-17";
}

function sourceName(row) {
  const origin = cleanNullable(row.origen);

  if (origin?.includes("Padrón Oficial")) {
    return "Padrón Oficial de Establecimientos Educativos 2026";
  }

  return origin ?? "Relevamiento de instituciones educativas Gualeguaychú 2026";
}

function sourceUrl(row) {
  return cleanWebsite(row.fuente_web_url, row.fuente_principal_url);
}

function schoolLevel(row) {
  return cleanNullable(row.carreras_oferta) ?? cleanNullable(row.tipo_nivel_modalidad) ?? "Oferta educativa";
}

function managementType(row) {
  return cleanNullable(row.gestion_clasificada) ?? cleanNullable(row.sector_padron);
}

function generalInfo(row) {
  return [
    row.cue_anexo ? `CUE/anexo: ${row.cue_anexo}` : null,
    cleanNullable(row.tipo_nivel_modalidad) ? `Nivel/modalidad: ${cleanNullable(row.tipo_nivel_modalidad)}` : null,
    cleanNullable(row.carreras_oferta) ? `Oferta: ${cleanNullable(row.carreras_oferta)}` : null,
    cleanNullable(row.ambito) ? `Ámbito: ${cleanNullable(row.ambito)}` : null,
    cleanNullable(row.sector_padron) ? `Sector: ${cleanNullable(row.sector_padron)}` : null,
    cleanNullable(row.observaciones),
  ]
    .filter(Boolean)
    .join("\n");
}

function schoolNumber(name) {
  const normalized = normalizeCompact(name);
  const matches = normalized.match(/\b\d{1,4}\b/g);

  return matches?.at(-1) ?? null;
}

function distinctiveTokens(name) {
  return new Set(
    normalizeCompact(name)
      .split(" ")
      .filter((token) => token.length >= 4 && !stopWords.has(token) && !/^\d+$/.test(token)),
  );
}

function makeSchoolMatcher(existingRows) {
  const exact = new Map(existingRows.map((row) => [normalizeCompact(row.name), row]));
  const enriched = existingRows.map((row) => ({
    ...row,
    normalizedName: normalizeCompact(row.name),
    number: schoolNumber(row.name),
    tokens: distinctiveTokens(row.name),
  }));

  return {
    rows: enriched,
    add(row) {
      exact.set(normalizeCompact(row.name), row);
      enriched.push({
        ...row,
        normalizedName: normalizeCompact(row.name),
        number: schoolNumber(row.name),
        tokens: distinctiveTokens(row.name),
      });
    },
    find(name) {
      const normalizedName = normalizeCompact(name);
      const exactMatch = exact.get(normalizedName);
      if (exactMatch) return exactMatch;

      const number = schoolNumber(name);
      const tokens = distinctiveTokens(name);

      if (!number || tokens.size < 2) return null;

      let bestMatch = null;
      let bestOverlap = 0;

      for (const candidate of enriched) {
        if (candidate.number !== number) continue;

        const overlap = [...tokens].filter((token) => candidate.tokens.has(token)).length;
        if (overlap > bestOverlap) {
          bestMatch = candidate;
          bestOverlap = overlap;
        }
      }

      return bestOverlap >= 2 ? bestMatch : null;
    },
  };
}

function inGualeguaychu(latitude, longitude) {
  return latitude <= -32.75 && latitude >= -33.35 && longitude <= -58.15 && longitude >= -58.85;
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(query, cache) {
  if (!query || skipGeocode) return null;

  if (Object.prototype.hasOwnProperty.call(cache, query)) {
    return cache[query];
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ar",
    viewbox: "-58.85,-32.75,-58.15,-33.35",
    bounded: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "aulaCiencias/1.0 (local data import)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim ${response.status} for ${query}`);
  }

  const [item] = await response.json();
  const latitude = Number(item?.lat);
  const longitude = Number(item?.lon);
  const result =
    Number.isFinite(latitude) && Number.isFinite(longitude) && inGualeguaychu(latitude, longitude)
      ? { latitude: latitude.toFixed(7), longitude: longitude.toFixed(7), label: item.display_name }
      : null;

  cache[query] = result;
  saveCache(cache);
  await delay(geocodeDelayMs);

  return result;
}

async function geocodeBest(row, cache) {
  for (const query of geocodeQueries(row)) {
    const result = await geocode(query, cache);

    if (result) {
      return result;
    }
  }

  return null;
}

function mapUrl(coordinates) {
  if (!coordinates) return null;

  return `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=17/${coordinates.latitude}/${coordinates.longitude}`;
}

function isHigherRow(row) {
  const value = normalize([row.institucion, row.tipo_nivel_modalidad, row.carreras_oferta].filter(Boolean).join(" "));

  return (
    value.includes("univers") ||
    value.includes("snu") ||
    value.includes("superior") ||
    value.includes("profesor") ||
    value.includes("tecnicatura") ||
    value.includes("formacion profesional") ||
    value.includes("instituto de ensenanza superior")
  );
}

function institutionType(row) {
  const value = normalize([row.institucion, row.tipo_nivel_modalidad, row.carreras_oferta].filter(Boolean).join(" "));

  if (value.includes("univers")) return "universidad";
  if (value.includes("profesor")) return "profesorado";
  if (value.includes("formacion profesional")) return "formacion profesional";
  if (value.includes("snu") || value.includes("superior") || value.includes("tecnicatura")) return "terciario";

  return "otro";
}

function academicLevel(row) {
  const value = normalize([row.tipo_nivel_modalidad, row.carreras_oferta].filter(Boolean).join(" "));

  if (value.includes("univers")) return "Universitario";
  if (value.includes("profesor")) return "Profesorado";
  if (value.includes("formacion profesional")) return "Formación profesional";
  if (value.includes("snu") || value.includes("superior") || value.includes("tecnicatura")) return "Superior";

  return cleanNullable(row.tipo_nivel_modalidad) ?? "Oferta académica";
}

function programNames(row) {
  const offer = cleanNullable(row.carreras_oferta);
  if (!offer) return [];

  return offer
    .split(";")
    .flatMap((item) => item.split(/\by\b/i))
    .map((item) =>
      item
        .replace(/^oferta local reportada:\s*/i, "")
        .replace(/^oferta cau\/virtual amplia según ciclo vigente,\s*ejemplos:\s*/i, "")
        .replace(/^oferta por convenios:\s*/i, "")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter((item) => item.length >= 4)
    .filter((item) => !/no informado|segun convocatoria vigente|según convocatoria vigente|otras ofertas|otras carreras/i.test(item));
}

async function upsertSchool(client, matcher, row, coordinates) {
  const name = cleanNullable(row.institucion);
  if (!name) return "skipped";

  const address = displayAddress(row.direccion);
  const existing = matcher.find(name);
  const values = [
    schoolLevel(row),
    managementType(row),
    address,
    cleanNullable(row.telefono),
    cleanNullable(row.correo),
    cleanWebsite(row.sitio_web, row.fuente_web_url),
    sourceName(row),
    sourceUrl(row),
    sourceDate(row),
    coordinates?.latitude ?? null,
    coordinates?.longitude ?? null,
    mapUrl(coordinates),
    generalInfo(row),
  ];

  if (dryRun) {
    return existing ? "updated" : "inserted";
  }

  if (existing) {
    await client.query(
      `
        update schools
        set level = $1,
            management_type = $2,
            address = $3,
            phone = $4,
            email = $5,
            website = $6,
            source_name = $7,
            source_url = $8,
            last_verified_at = $9,
            latitude = $10,
            longitude = $11,
            map_url = $12,
            general_info = $13,
            is_visible = true,
            updated_at = now()
        where id = $14
      `,
      [...values, existing.id],
    );

    return "updated";
  }

  const result = await client.query(
    `
      insert into schools (
        name,
        level,
        management_type,
        address,
        phone,
        email,
        website,
        source_name,
        source_url,
        last_verified_at,
        latitude,
        longitude,
        map_url,
        general_info,
        is_visible
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      returning id, name
    `,
    [name, ...values],
  );

  matcher.add(result.rows[0]);

  return "inserted";
}

async function upsertInstitution(client, row, coordinates) {
  if (!isHigherRow(row) || dryRun) return null;

  const name = cleanNullable(row.institucion);
  if (!name) return null;

  const address = displayAddress(row.direccion);
  const values = [
    institutionType(row),
    generalInfo(row),
    address,
    "Gualeguaychú",
    cleanNullable(row.telefono),
    cleanNullable(row.correo),
    cleanWebsite(row.sitio_web, row.fuente_web_url),
    coordinates?.latitude ?? null,
    coordinates?.longitude ?? null,
    sourceName(row),
    sourceUrl(row),
    sourceDate(row),
  ];
  const existing = await client.query("select id from institutions where lower(name) = lower($1) limit 1", [name]);

  if (existing.rows[0]) {
    await client.query(
      `
        update institutions
        set type = $1,
            description = $2,
            address = $3,
            city = $4,
            phone = $5,
            email = $6,
            website = $7,
            latitude = $8,
            longitude = $9,
            source_name = $10,
            source_url = $11,
            last_verified_at = $12,
            is_active = true,
            updated_at = now()
        where id = $13
      `,
      [...values, existing.rows[0].id],
    );

    return existing.rows[0].id;
  }

  const result = await client.query(
    `
      insert into institutions (
        name,
        type,
        description,
        address,
        city,
        phone,
        email,
        website,
        latitude,
        longitude,
        source_name,
        source_url,
        last_verified_at,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      returning id
    `,
    [name, ...values],
  );

  return result.rows[0].id;
}

async function upsertPrograms(client, institutionId, row) {
  if (!institutionId || dryRun) return 0;

  let count = 0;
  for (const name of programNames(row)) {
    const existing = await client.query(
      "select id from academic_programs where institution_id = $1 and lower(name) = lower($2) limit 1",
      [institutionId, name],
    );
    const values = [
      academicLevel(row),
      null,
      null,
      null,
      generalInfo(row),
      cleanWebsite(row.fuente_web_url, row.sitio_web),
      sourceName(row),
      sourceUrl(row),
      sourceDate(row),
    ];

    if (existing.rows[0]) {
      await client.query(
        `
          update academic_programs
          set academic_level = $1,
              title_granted = $2,
              duration = $3,
              modality = $4,
              description = $5,
              website = $6,
              source_name = $7,
              source_url = $8,
              last_verified_at = $9,
              is_active = true,
              updated_at = now()
          where id = $10
        `,
        [...values, existing.rows[0].id],
      );
    } else {
      await client.query(
        `
          insert into academic_programs (
            institution_id,
            name,
            academic_level,
            title_granted,
            duration,
            modality,
            description,
            website,
            source_name,
            source_url,
            last_verified_at,
            is_active
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        `,
        [institutionId, name, ...values],
      );
    }

    count += 1;
  }

  return count;
}

async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const cache = loadCache();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let geocoded = 0;
  let missingCoordinates = 0;
  let higherInstitutions = 0;
  let programs = 0;

  try {
    const existingSchools = await client.query("select id, name from schools");
    const matcher = makeSchoolMatcher(existingSchools.rows);

    for (const [index, row] of rows.entries()) {
      const coordinates = await geocodeBest(row, cache);

      if (coordinates) {
        geocoded += 1;
      } else {
        missingCoordinates += 1;
      }

      const result = await upsertSchool(client, matcher, row, coordinates);
      inserted += result === "inserted" ? 1 : 0;
      updated += result === "updated" ? 1 : 0;
      skipped += result === "skipped" ? 1 : 0;

      const institutionId = await upsertInstitution(client, row, coordinates);
      if (institutionId) {
        higherInstitutions += 1;
        programs += await upsertPrograms(client, institutionId, row);
      }

      if ((index + 1) % 10 === 0 || index + 1 === rows.length) {
        console.log(`Procesadas ${index + 1}/${rows.length}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        csvPath,
        rows: rows.length,
        inserted,
        updated,
        skipped,
        geocoded,
        missingCoordinates,
        higherInstitutions,
        programs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
