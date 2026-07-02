import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { and, eq, isNull, like, sql } from "drizzle-orm";
import {
  bookingAvailableLevels,
  bookingSubjectCatalog,
  canonicalBookingSubjectNames,
  shouldListBookingTopicsForLevel,
} from "../bookings/catalog.js";
import { requireEnv } from "../config/env.js";
import { closeDb, getDb } from "./client.js";
import {
  appSettings,
  bookingFilterOptions,
  bookingTimeSlots,
  contentBlocks,
  downloadableCategories,
  downloadableContents,
  academicPrograms,
  glossaryArticleLevels,
  glossaryArticleRelatedTopics,
  glossaryArticleSources,
  glossaryArticles,
  glossaryTopics,
  institutions,
  programTopics,
  schools,
  subjectHighlights,
  subjects,
  topics,
  users,
} from "./schema.js";

function normalizeSeedKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function seedSlug(value: string) {
  return normalizeSeedKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface FlatTemarioSeedRow {
  level_id: string;
  level_name: string;
  plan: string;
  anio: string;
  orientacion: string;
  institucion: string;
  carrera: string;
  subject: string;
  axis: string;
  topic: string;
  status: string;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (char === "," && !isQuoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

async function loadFlatTemarioSeedRows() {
  const seedPath = resolve(dirname(fileURLToPath(import.meta.url)), "data/codex_temarios_flat_import.csv");
  const csv = await readFile(seedPath, "utf8");
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine) as (keyof FlatTemarioSeedRow)[];

  return lines
    .map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])) as unknown as FlatTemarioSeedRow;
    })
    .filter((row) => row.subject && row.topic);
}

function displayLevel(row: FlatTemarioSeedRow) {
  const level = normalizeSeedKey(row.level_name);

  if (level.includes("primaria")) return "Primaria";
  if (level.includes("secundaria")) return "Secundaria";
  if (level.includes("universitaria")) return "Universitaria";
  if (level.includes("superior")) return "Terciaria";

  return row.level_name || row.level_id || "General";
}

function formatDisplayYear(value: string) {
  if (/^\d+$/.test(value)) return `${value}.º año`;

  return value;
}

function displayYears(row: FlatTemarioSeedRow) {
  const value = row.anio.trim();
  const rangeMatch = value.match(/^(\d+)\s*-\s*(\d+)$/);

  if (!value) return [null];

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);

    if (Number.isInteger(start) && Number.isInteger(end) && start <= end && end - start <= 12) {
      return Array.from({ length: end - start + 1 }, (_, index) => `${start + index}.º año`);
    }
  }

  return [formatDisplayYear(value)];
}

function displayTrack(row: FlatTemarioSeedRow) {
  const level = normalizeSeedKey(row.level_name);
  const orientation = row.orientacion.trim();
  const career = row.carrera.trim();

  if (orientation) {
    return orientation.replace(/^Orientación en\s+/i, "");
  }

  if (level.includes("profesorado")) {
    return career || "Profesorado";
  }

  if (level.includes("tecnicatura") || level.includes("formacion profesional")) {
    if (normalizeSeedKey(career).includes("formacion profesional")) return "Formación Profesional";
    return career || "Tecnicatura";
  }

  if (level.includes("universitaria")) {
    return career || "Universitaria";
  }

  return null;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed[0].toUpperCase()}${trimmed.slice(1)}` : trimmed;
}

function importedTopicTitle(row: FlatTemarioSeedRow) {
  return sentenceCase(row.topic);
}

function importedTopicNotes(row: FlatTemarioSeedRow) {
  return [
    row.status ? `Estado: ${row.status}` : null,
    row.plan ? `Plan: ${row.plan}` : null,
    row.institucion ? `Institución: ${row.institucion}` : null,
    row.carrera ? `Carrera: ${row.carrera}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const verifiedAt = "2026-06-16";

const initialDownloadableCategories = [
  { name: "Biología", slug: "biologia" },
  { name: "Física", slug: "fisica" },
  { name: "General", slug: "general" },
  { name: "Química", slug: "quimica" },
  { name: "Matemática", slug: "matematica" },
  { name: "Primaria", slug: "primaria" },
  { name: "Secundaria", slug: "secundaria" },
];

const initialDownloadables = [
  {
    title: "Jerarquía de operaciones",
    description: "Infografía de matemática sobre cálculos combinados, prioridad de operaciones y regla de signos.",
    imageUrl: "/materiales/jerarquia-operaciones.jpeg",
    categorySlug: "matematica",
    isFeatured: true,
    displayOrder: 10,
  },
  {
    title: "Qué es la biología",
    description: "Infografía introductoria sobre biología, seres vivos y características de los organismos.",
    imageUrl: "/materiales/que-es-biologia.jpeg",
    categorySlug: "biologia",
    isFeatured: true,
    displayOrder: 20,
  },
  {
    title: "Propiedades de la potenciación y radicación",
    description: "Resumen visual de propiedades de potencias y raíces para simplificar expresiones.",
    imageUrl: "/materiales/potenciacion-radicacion.jpeg",
    categorySlug: "matematica",
    isFeatured: true,
    displayOrder: 30,
  },
  {
    title: "Conceptos básicos de química",
    description: "Infografía de química sobre materia, sistemas materiales, estados y cambios de estado.",
    imageUrl: "/materiales/conceptos-basicos-quimica.jpeg",
    categorySlug: "quimica",
    isFeatured: true,
    displayOrder: 40,
  },
  {
    title: "Propiedades y cambios de la materia",
    description: "Material de química sobre propiedades intensivas, extensivas, cambios físicos y cambios químicos.",
    imageUrl: "/materiales/propiedades-cambios-materia.jpeg",
    categorySlug: "quimica",
    isFeatured: true,
    displayOrder: 50,
  },
  {
    title: "Sistema internacional de unidades",
    description: "Infografía de física sobre unidades básicas del SI, magnitudes y prefijos de medida.",
    imageUrl: "/materiales/sistema-internacional-unidades.jpeg",
    categorySlug: "fisica",
    isFeatured: true,
    displayOrder: 60,
  },
  {
    title: "Cinemática",
    description: "Material de física sobre movimiento, MRU, MRUV, magnitudes y ecuaciones fundamentales.",
    imageUrl: "/materiales/cinematica.jpeg",
    categorySlug: "fisica",
    isFeatured: true,
    displayOrder: 70,
  },
  {
    title: "Preparación para previas",
    description: "Flyer general de AulaCiencias para apoyo en Matemática, Físico-Química, Biología y Ciencias de la Tierra.",
    imageUrl: "/materiales/previa-aula-ciencias.jpeg",
    categorySlug: "general",
    isFeatured: true,
    displayOrder: 80,
  },
];

const legacyDownloadableTitlesToHide = [
  "Guía placeholder de laboratorio",
  "Mapa conceptual placeholder de células",
  "Ejercicios placeholder de matemática",
  "Foto placeholder de clase",
];

const initialSubjects = [
  { name: "Biología", slug: "biologia", description: "Temas de seres vivos, células, genética y ambiente.", displayOrder: 10 },
  { name: "Química", slug: "quimica", description: "Temas de materia, elementos, reacciones y laboratorio.", displayOrder: 20 },
  { name: "Matemática", slug: "matematica", description: "Temas de números, funciones, geometría y datos.", displayOrder: 30 },
  { name: "Física", slug: "fisica", description: "Temas de energía, movimiento, fuerzas y ondas.", displayOrder: 40 },
  { name: "Astronomía", slug: "astronomia", description: "Temas de planetas, estrellas y universo.", displayOrder: 50 },
  { name: "Geografía", slug: "geografia", description: "Temas de mapas, clima, relieve y territorio.", displayOrder: 60 },
  { name: "Ciencias Naturales", slug: "ciencias-naturales", description: "Temas integrados sobre naturaleza, vida y materia.", displayOrder: 70 },
  { name: "Tecnología", slug: "tecnologia", description: "Temas de técnica, materiales, circuitos y proyectos.", displayOrder: 80 },
];

const initialBookingTimeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

const initialInstitutions = [
  {
    name: "UADER FCyT - Sede Gualeguaychú",
    type: "universidad",
    description: "Sede Gualeguaychú de la Facultad de Ciencia y Tecnología de la Universidad Autónoma de Entre Ríos.",
    address: "Blvr. Montana y Nogoyá",
    city: "Gualeguaychú",
    phone: "(0343) 4975141 / 4975066",
    email: "fcyt_gualeguaychu@uader.edu.ar",
    website: "https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/",
    latitude: null,
    longitude: null,
    sourceName: "UADER FCyT - Sede Gualeguaychú",
    sourceUrl: "https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/",
    lastVerifiedAt: verifiedAt,
    programs: [
      {
        name: "Tecnicatura Universitaria en Gestión Ambiental",
        academicLevel: "Tecnicatura",
        titleGranted: "Técnico/a Universitario/a en Gestión Ambiental",
        duration: "3 años",
        modality: "presencial",
        description: "Carrera orientada a problemáticas ambientales, territorio, gestión y ciencias naturales.",
        topics: ["Biología", "Química", "Ambiente", "Geografía", "Gestión ambiental"],
      },
      {
        name: "Licenciatura en Gestión Ambiental",
        academicLevel: "Licenciatura",
        titleGranted: "Licenciado/a en Gestión Ambiental",
        duration: "4 años",
        modality: "presencial",
        description: "Formación de grado en gestión ambiental con base científica y territorial.",
        topics: ["Biología", "Química", "Ambiente", "Geografía", "Estadística"],
      },
    ],
  },
  {
    name: "UCU - Centro Regional Gualeguaychú",
    type: "universidad",
    description: "Centro Regional Gualeguaychú de la Universidad de Concepción del Uruguay.",
    address: "25 de Mayo 1312",
    city: "Gualeguaychú",
    phone: "03446-426852",
    email: "recepciongchu@ucu.edu.ar",
    website: "https://ucu.edu.ar/carreras/",
    latitude: null,
    longitude: null,
    sourceName: "UCU carreras e información institucional",
    sourceUrl: "https://ucu.edu.ar/carreras/",
    lastVerifiedAt: verifiedAt,
    programs: [
      {
        name: "Abogacía",
        academicLevel: "Abogacía",
        titleGranted: "Abogado/a",
        duration: "5 años",
        modality: "presencial",
        description: "Carrera de grado del área jurídica disponible en Gualeguaychú según oferta UCU.",
        topics: ["Derecho", "Lectura comprensiva", "Historia", "Ciudadanía"],
      },
      {
        name: "Licenciatura en Comercio Internacional",
        academicLevel: "Licenciatura",
        titleGranted: "Licenciado/a en Comercio Internacional",
        duration: "4 años",
        modality: "presencial",
        description: "Formación en comercio, economía, gestión y relaciones internacionales.",
        topics: ["Matemática", "Economía", "Inglés", "Estadística"],
      },
      {
        name: "Licenciatura en Comercialización y Gestión de Negocios",
        academicLevel: "Licenciatura",
        titleGranted: "Licenciado/a en Comercialización y Gestión de Negocios",
        duration: "4 años",
        modality: "presencial",
        description: "Formación en negocios, marketing, gestión y análisis comercial.",
        topics: ["Matemática", "Economía", "Comunicación", "Estadística"],
      },
      {
        name: "Profesorado Universitario de Educación Física",
        academicLevel: "Profesorado",
        titleGranted: "Profesor/a Universitario/a de Educación Física",
        duration: "4 años",
        modality: "presencial",
        description: "Profesorado universitario orientado a educación física y ciencias del movimiento.",
        topics: ["Biología", "Anatomía", "Salud", "Pedagogía"],
      },
    ],
  },
  {
    name: "UNER - Facultad de Bromatología",
    type: "universidad",
    description: "Facultad de la Universidad Nacional de Entre Ríos con sede en Gualeguaychú.",
    address: "25 de Mayo 709 / Pte. Perón 1154",
    city: "Gualeguaychú",
    phone: "(03446) 426115 / 426203 / 426345 / 426148",
    email: "soporte.fb@uner.edu.ar",
    website: "https://www.fb.uner.edu.ar/carreras-3/",
    latitude: null,
    longitude: null,
    sourceName: "UNER Facultad de Bromatología - Carreras",
    sourceUrl: "https://www.fb.uner.edu.ar/carreras-3/",
    lastVerifiedAt: verifiedAt,
    programs: [
      {
        name: "Tecnicatura Universitaria en Química",
        academicLevel: "Tecnicatura",
        titleGranted: "Técnico/a Universitario/a en Química",
        duration: null,
        modality: "presencial",
        description: "Carrera de pregrado de la Facultad de Bromatología orientada a química aplicada y laboratorio.",
        topics: ["Química", "Laboratorio", "Matemática"],
      },
      {
        name: "Tecnicatura en Control Bromatológico",
        academicLevel: "Tecnicatura",
        titleGranted: "Técnico/a en Control Bromatológico",
        duration: null,
        modality: "a distancia",
        description: "Carrera de pregrado orientada al control bromatológico de alimentos.",
        topics: ["Química", "Biología", "Laboratorio"],
      },
      {
        name: "Licenciatura en Bromatología",
        academicLevel: "Licenciatura",
        titleGranted: "Licenciado/a en Bromatología",
        duration: null,
        modality: "presencial",
        description: "Carrera universitaria centrada en alimentos, análisis bromatológico y salud pública.",
        topics: ["Química", "Biología", "Laboratorio", "Estadística"],
      },
      {
        name: "Licenciatura en Nutrición",
        academicLevel: "Licenciatura",
        titleGranted: "Licenciado/a en Nutrición",
        duration: null,
        modality: "presencial",
        description: "Formación universitaria en nutrición, alimentación, salud y ciencias biológicas.",
        topics: ["Biología", "Química", "Salud", "Estadística"],
      },
      {
        name: "Farmacia",
        academicLevel: "Farmacia",
        titleGranted: "Farmacéutico/a",
        duration: null,
        modality: "presencial",
        description: "Carrera universitaria de farmacia con base en química, biología y ciencias de la salud.",
        topics: ["Química", "Biología", "Laboratorio"],
      },
      {
        name: "Bioquímica",
        academicLevel: "Bioquímica",
        titleGranted: "Bioquímico/a",
        duration: null,
        modality: "presencial",
        description: "Carrera universitaria orientada al análisis bioquímico, laboratorio y ciencias biomédicas.",
        topics: ["Biología", "Química", "Laboratorio"],
      },
      {
        name: "Medicina Veterinaria",
        academicLevel: "Medicina Veterinaria",
        titleGranted: "Médico/a Veterinario/a",
        duration: null,
        modality: "presencial",
        description: "Carrera universitaria de ciencias veterinarias disponible en la Facultad de Bromatología.",
        topics: ["Biología", "Química", "Salud"],
      },
    ],
  },
];

const initialContentBlocks = [
  {
    key: "home.subjectCarousel",
    title: "Ventanas de glosario",
    body: "Materias y conceptos con definiciones breves, artículos completos y vínculos con profesiones reales.",
    imageUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 10,
  },
  {
    key: "glossary.header",
    title: "Glosario",
    body: "Definiciones, profesiones relacionadas y trabajos comunes para cada campo del conocimiento.",
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 20,
  },
  {
    key: "home.downloadables",
    eyebrow: "Contenido descargable",
    title: "Fotos y materiales recientes",
    body: "Placeholder para publicar guías, fotos, mapas conceptuales, ejercicios y recursos listos para descargar.",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 30,
  },
  {
    key: "home.topics",
    eyebrow: "Orientación académica",
    title: "Elegir qué estudiar",
    body: "Carreras e instituciones de Gualeguaychú organizadas por nivel, intereses y fuentes verificables.",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 40,
  },
  {
    key: "home.schools",
    eyebrow: "Colegios de Gualeguaychú",
    title: "Buscar escuela y ver información",
    body: "Placeholder para consultar escuelas, direcciones, teléfonos y datos generales.",
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 50,
  },
  {
    key: "home.booking",
    eyebrow: "¿Qué necesitás reforzar?",
    title: "Selecciona temarios y reserva un horario",
    body: "Placeholder para explicar condiciones de reserva, pago, cupos y canales de contacto.",
    imageUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
    displayOrder: 60,
  },
];

const initialSubjectHighlights = [
  {
    title: "Biologia",
    slug: "biologia",
    keywords: "celulas, ADN, ecosistemas, seres vivos",
    definition: "La biologia estudia los seres vivos, sus procesos, su diversidad y la manera en que se relacionan con el ambiente.",
    professions: "Biologo/a, Bioquimico/a, Medico/a, Biotecnologo/a",
    jobs: "Investigacion en laboratorio, Analisis clinicos, Gestion ambiental, Docencia cientifica",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "biologia",
    displayOrder: 10,
  },
  {
    title: "Celulas",
    slug: "celulas",
    keywords: "microscopio, tejidos, organos, sistemas",
    definition: "El estudio celular observa la unidad basica de la vida: su estructura, sus organulos y las funciones que sostienen a los organismos.",
    professions: "Citotecnico/a, Biologo/a molecular, Patologo/a, Tecnico/a de laboratorio",
    jobs: "Observacion microscopica, Diagnostico celular, Cultivos celulares, Control de calidad biologico",
    imageUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "biologia",
    displayOrder: 20,
  },
  {
    title: "Genetica",
    slug: "genetica",
    keywords: "ADN, herencia, cromosomas, variacion",
    definition: "La genetica analiza como se transmite la informacion hereditaria y como los genes influyen en las caracteristicas de los seres vivos.",
    professions: "Genetista, Biotecnologo/a, Consejero/a genetico/a, Investigador/a biomedico/a",
    jobs: "Analisis de ADN, Mejora genetica, Investigacion de enfermedades, Asesoramiento genetico",
    imageUrl: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "biologia",
    displayOrder: 30,
  },
  {
    title: "Ecologia",
    slug: "ecologia",
    keywords: "ecosistemas, ambiente, energia, cadenas",
    definition: "La ecologia estudia las relaciones entre los organismos y su entorno, incluyendo ecosistemas, poblaciones y flujos de energia.",
    professions: "Ecologo/a, Ingeniero/a ambiental, Guardaparque, Consultor/a ambiental",
    jobs: "Monitoreo ambiental, Restauracion de ecosistemas, Evaluacion de impacto, Conservacion de especies",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "biologia",
    displayOrder: 40,
  },
  {
    title: "Quimica",
    slug: "quimica",
    keywords: "tabla periodica, reacciones, soluciones, pH",
    definition: "La quimica estudia la materia, sus propiedades, su composicion y las transformaciones que ocurren en las reacciones.",
    professions: "Quimico/a, Farmaceutico/a, Ingeniero/a quimico/a, Bromatologo/a",
    jobs: "Control de calidad, Desarrollo de medicamentos, Analisis de alimentos, Procesos industriales",
    imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "quimica",
    displayOrder: 50,
  },
  {
    title: "Laboratorio",
    slug: "laboratorio",
    keywords: "mezclas, soluciones, mediciones, experimentos",
    definition: "El trabajo de laboratorio aplica metodos experimentales para medir, comparar, comprobar hipotesis y registrar resultados confiables.",
    professions: "Tecnico/a de laboratorio, Analista quimico/a, Bioquimico/a, Investigador/a",
    jobs: "Preparacion de muestras, Mediciones instrumentales, Ensayos de calidad, Registro de resultados",
    imageUrl: "https://images.unsplash.com/photo-1581093458791-9d15482442f6?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "quimica",
    displayOrder: 60,
  },
  {
    title: "Tabla periodica",
    slug: "tabla-periodica",
    keywords: "elementos, atomos, enlaces, propiedades",
    definition: "La tabla periodica organiza los elementos quimicos segun su numero atomico y permite anticipar propiedades y comportamientos.",
    professions: "Quimico/a, Docente de ciencias, Ingeniero/a de materiales, Analista de laboratorio",
    jobs: "Seleccion de materiales, Formulacion de productos, Analisis elemental, Ensenanza de quimica",
    imageUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "quimica",
    displayOrder: 70,
  },
  {
    title: "Fisica",
    slug: "fisica",
    keywords: "fuerzas, movimiento, energia, ondas",
    definition: "La fisica estudia la energia, la materia, el movimiento y las leyes que explican los fenomenos naturales.",
    professions: "Fisico/a, Ingeniero/a, Astronomo/a, Tecnico/a en energias",
    jobs: "Modelado de sistemas, Mediciones tecnicas, Desarrollo tecnologico, Investigacion aplicada",
    imageUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "fisica",
    displayOrder: 80,
  },
  {
    title: "Matematica",
    slug: "matematica",
    keywords: "ecuaciones, funciones, geometria, potencias",
    definition: "La matematica construye herramientas para razonar con numeros, formas, patrones, relaciones y modelos abstractos.",
    professions: "Matematico/a, Actuario/a, Cientifico/a de datos, Docente",
    jobs: "Analisis de datos, Modelos predictivos, Finanzas cuantitativas, Resolucion de problemas tecnicos",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "matematica",
    displayOrder: 90,
  },
  {
    title: "Algebra",
    slug: "algebra",
    keywords: "ecuaciones, despejes, variables, problemas",
    definition: "El algebra usa variables, expresiones y ecuaciones para representar relaciones y resolver problemas generales.",
    professions: "Analista de datos, Programador/a, Ingeniero/a, Economista",
    jobs: "Automatizacion de calculos, Optimizacion, Programacion, Analisis financiero",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "matematica",
    displayOrder: 100,
  },
  {
    title: "Geometria",
    slug: "geometria",
    keywords: "figuras, area, volumen, medidas",
    definition: "La geometria estudia figuras, cuerpos, medidas y posiciones en el espacio para describir y construir formas.",
    professions: "Arquitecto/a, Disenador/a industrial, Agrimensor/a, Ingeniero/a civil",
    jobs: "Planos y estructuras, Modelado 3D, Mediciones de terrenos, Diseno de objetos",
    imageUrl: "https://images.unsplash.com/photo-1605711285791-0219e80e43a3?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "matematica",
    displayOrder: 110,
  },
  {
    title: "Estadistica",
    slug: "estadistica",
    keywords: "graficos, datos, promedios, porcentajes",
    definition: "La estadistica organiza, interpreta y comunica datos para tomar decisiones con evidencia.",
    professions: "Estadistico/a, Cientifico/a de datos, Epidemiologo/a, Analista de mercado",
    jobs: "Encuestas, Tableros de datos, Analisis de riesgo, Investigacion social y sanitaria",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "matematica",
    displayOrder: 120,
  },
  {
    title: "Astronomia",
    slug: "astronomia",
    keywords: "planetas, universo, orbita, estrellas",
    definition: "La astronomia estudia los astros, el universo y los fenomenos que ocurren mas alla de la Tierra.",
    professions: "Astronomo/a, Astrofisico/a, Ingeniero/a aeroespacial, Divulgador/a cientifico/a",
    jobs: "Observacion astronomica, Analisis de imagenes, Misiones espaciales, Divulgacion cientifica",
    imageUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "astronomia",
    displayOrder: 130,
  },
  {
    title: "Geografia",
    slug: "geografia",
    keywords: "mapas, relieve, clima, territorio",
    definition: "La geografia estudia los territorios, los paisajes y la relacion entre las sociedades y el espacio que habitan.",
    professions: "Geografo/a, Cartografo/a, Planificador/a urbano/a, Climatologo/a",
    jobs: "Mapas digitales, Ordenamiento territorial, Gestion de riesgos, Analisis climatico",
    imageUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "geografia",
    displayOrder: 140,
  },
  {
    title: "Ciencias naturales",
    slug: "ciencias-naturales",
    keywords: "materia, vida, tierra, ambiente",
    definition: "Las ciencias naturales integran biologia, fisica, quimica y geociencias para comprender la naturaleza y sus cambios.",
    professions: "Docente de ciencias, Divulgador/a, Tecnico/a ambiental, Investigador/a",
    jobs: "Educacion cientifica, Proyectos ambientales, Museos y centros educativos, Apoyo a investigaciones",
    imageUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "ciencias-naturales",
    displayOrder: 150,
  },
  {
    title: "Tecnologia",
    slug: "tecnologia",
    keywords: "circuitos, materiales, proyectos, tecnica",
    definition: "La tecnologia aplica conocimientos cientificos y tecnicos para crear soluciones, herramientas, sistemas y procesos.",
    professions: "Programador/a, Tecnico/a electronico/a, Ingeniero/a, Disenador/a de producto",
    jobs: "Desarrollo de software, Armado de circuitos, Soporte tecnico, Prototipado y automatizacion",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    subjectSlug: "tecnologia",
    displayOrder: 160,
  },
];

const commonTopics = [
  {
    title: "Celula y niveles de organizacion",
    introduction: "Reconocimiento de celulas, tejidos, organos, sistemas y organismos.",
    importance: "Es la base para comprender los seres vivos y sus funciones.",
    subject: "Biologia",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "1° año",
    relatedCareers: "Medicina, bioquimica, enfermeria, biotecnologia",
    estimatedMinutes: 60,
  },
  {
    title: "Fotosintesis y respiracion celular",
    introduction: "Procesos por los que los seres vivos obtienen y transforman energia.",
    importance: "Permite relacionar plantas, animales, ambiente y energia.",
    subject: "Biologia",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "2° año",
    relatedCareers: "Biologia, agronomia, ciencias ambientales",
    estimatedMinutes: 60,
  },
  {
    title: "Genetica basica y ADN",
    introduction: "Genes, cromosomas, herencia y variacion biologica.",
    importance: "Ayuda a interpretar la transmision de caracteristicas.",
    subject: "Biologia",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "4° año",
    relatedCareers: "Genetica, medicina, biotecnologia",
    estimatedMinutes: 60,
  },
  {
    title: "Ecosistemas y cadenas alimentarias",
    introduction: "Relaciones entre organismos, productores, consumidores y descomponedores.",
    importance: "Ordena el estudio del ambiente y sus equilibrios.",
    subject: "Biologia",
    educationLevel: "Primaria",
    educationTrack: "Primaria",
    schoolYear: "6° grado",
    relatedCareers: "Ecologia, veterinaria, gestion ambiental",
    estimatedMinutes: 60,
  },
  {
    title: "Tabla periodica y enlaces quimicos",
    introduction: "Elementos, grupos, periodos y uniones entre atomos.",
    importance: "Es clave para entender sustancias y reacciones.",
    subject: "Quimica",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "3° año",
    relatedCareers: "Quimica, farmacia, ingenieria, bioquimica",
    estimatedMinutes: 60,
  },
  {
    title: "Reacciones quimicas y balanceo",
    introduction: "Reactivos, productos, conservacion de masa y ecuaciones.",
    importance: "Permite resolver ejercicios y describir cambios de materia.",
    subject: "Quimica",
    educationLevel: "Secundaria",
    educationTrack: "Técnico",
    schoolYear: "4° año",
    relatedCareers: "Ingenieria quimica, laboratorio, farmacia",
    estimatedMinutes: 60,
  },
  {
    title: "Soluciones, concentracion y mezclas",
    introduction: "Tipos de mezclas, soluto, solvente y formas de expresar concentracion.",
    importance: "Se usa en laboratorio, salud, alimentos y ambiente.",
    subject: "Quimica",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "4° año",
    relatedCareers: "Bioquimica, nutricion, farmacia",
    estimatedMinutes: 60,
  },
  {
    title: "Acidos, bases y pH",
    introduction: "Propiedades de acidos y bases, indicadores y escala de pH.",
    importance: "Conecta la quimica escolar con procesos cotidianos.",
    subject: "Quimica",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "5° año",
    relatedCareers: "Quimica, medicina, alimentos",
    estimatedMinutes: 60,
  },
  {
    title: "Fracciones, decimales y porcentajes",
    introduction: "Operaciones y equivalencias entre formas numericas.",
    importance: "Base para problemas de primaria y secundaria.",
    subject: "Matematica",
    educationLevel: "Primaria",
    educationTrack: "Primaria",
    schoolYear: "5° grado",
    relatedCareers: "Administracion, economia, ingenieria, docencia",
    estimatedMinutes: 60,
  },
  {
    title: "Potenciacion y radicacion",
    introduction: "Propiedades, exponentes, raices y simplificacion.",
    importance: "Prepara para algebra, funciones y calculos avanzados.",
    subject: "Matematica",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "2° año",
    relatedCareers: "Ingenieria, arquitectura, informatica",
    estimatedMinutes: 60,
  },
  {
    title: "Ecuaciones de primer grado",
    introduction: "Resolucion de ecuaciones, despeje y problemas.",
    importance: "Es una herramienta central para modelar situaciones.",
    subject: "Matematica",
    educationLevel: "Secundaria",
    educationTrack: "Bachiller",
    schoolYear: "1° año",
    relatedCareers: "Ciencias exactas, economia, programacion",
    estimatedMinutes: 60,
  },
  {
    title: "Funciones lineales y graficos",
    introduction: "Pendiente, ordenada al origen, tablas y representacion grafica.",
    importance: "Ayuda a interpretar relaciones entre variables.",
    subject: "Matematica",
    educationLevel: "Secundaria",
    educationTrack: "Técnico",
    schoolYear: "3° año",
    relatedCareers: "Ingenieria, economia, fisica, datos",
    estimatedMinutes: 60,
  },
  {
    title: "Geometria y perimetro, area y volumen",
    introduction: "Figuras planas, cuerpos, medidas y formulas.",
    importance: "Se aplica en problemas visuales y cotidianos.",
    subject: "Matematica",
    educationLevel: "Primaria",
    educationTrack: "Primaria",
    schoolYear: "6° grado",
    relatedCareers: "Arquitectura, diseno, ingenieria",
    estimatedMinutes: 60,
  },
];

const gualeguaychuSchools = [
  {
    name: "Escuela Normal Superior Olegario Victor Andrade",
    level: "Primario / Secundario / Superior",
    managementType: "Estatal",
    address: "Gervasio Mendez 676, Gualeguaychu, Entre Rios",
    phone: "03446 426448 / 03446 424875",
    email: "ifdenova@yahoo.com.ar",
    generalInfo: "Institucion estatal historica de Gualeguaychu con niveles obligatorios y formacion superior docente.",
  },
  {
    name: "Instituto Nuestra Senora de Guadalupe",
    level: "Secundario",
    managementType: "Privada",
    address: "Schachtel entre Urquiza y L. N. Palma, Gualeguaychu, Entre Rios",
    phone: "03446 433595",
    email: "institutoguadaluped107@gmail.com",
    generalInfo: "Colegio secundario de gestion privada identificado como D-107.",
  },
  {
    name: "Instituto Dr. Jose Maria Bértora",
    level: "Inicial / Primario / Secundario",
    managementType: "Privada",
    address: "Gervasio Mendez y Alberdi, Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Institucion privada con propuesta integral desde nivel inicial hasta secundario.",
  },
  {
    name: "Escuela N° 4 Gervasio Mendez",
    level: "Primario",
    managementType: "Estatal",
    address: "Rivadavia 952, Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela primaria publica tradicional de Gualeguaychu.",
  },
  {
    name: "Escuela Malvina Segui de Clavarino",
    level: "Primario",
    managementType: "Estatal",
    address: "Lestonnac 1350, Gualeguaychu, Entre Rios",
    phone: "+54 3446 42-2487",
    email: null,
    generalInfo: "Institucion educativa primaria ubicada en Gualeguaychu.",
  },
  {
    name: "Escuela N° 106 Dr. Carlos Pellegrini",
    level: "Inicial / Primario",
    managementType: "Estatal",
    address: "Primera Junta 1148, Gualeguaychu, Entre Rios",
    phone: "03446 42-9348",
    email: null,
    generalInfo: "Escuela publica de nivel inicial y primario.",
  },
  {
    name: "Escuela N° 24 J. J. Nagera",
    level: "Primario",
    managementType: "Estatal",
    address: "Avenida del Valle, Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela primaria publica de Gualeguaychu.",
  },
  {
    name: "Escuela N° 44 Maria Mercedes Balcarce y San Martin",
    level: "Primario",
    managementType: "Estatal",
    address: "Alferez Sobral, Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela primaria publica de barrio.",
  },
  {
    name: "Escuela N° 66 Bartolito Mitre",
    level: "Primario",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela primaria provincial de gestion estatal.",
  },
  {
    name: "Escuela N° 68 Fray Mamerto Esquiu",
    level: "Primario",
    managementType: "Estatal",
    address: "Urquiza, Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela primaria de Gualeguaychu.",
  },
  {
    name: "Escuela Secundaria N° 22 Pbro. Jeannot Sueyro",
    level: "Secundario",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela secundaria estatal de Gualeguaychu.",
  },
  {
    name: "Escuela Secundaria N° 21 Esteban Piacenza - El Potrero",
    level: "Secundario",
    managementType: "Estatal",
    address: "El Potrero, Departamento Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela secundaria de zona rural del departamento Gualeguaychu.",
  },
  {
    name: "Escuela Secundaria N° 20",
    level: "Secundario",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela secundaria estatal registrada en listados educativos provinciales.",
  },
  {
    name: "Escuela Secundaria N° 9",
    level: "Secundario",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela secundaria de Gualeguaychu mencionada en registros educativos oficiales.",
  },
  {
    name: "Colegio Nacional Luis Clavarino",
    level: "Secundario / Superior",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Institucion historica de educacion secundaria/superior de Gualeguaychu.",
  },
  {
    name: "Escuela de Educacion Tecnica Presbitero Colombo",
    level: "Secundario Tecnico",
    managementType: "Estatal",
    address: "Gualeguaychu, Entre Rios",
    phone: null,
    email: null,
    generalInfo: "Escuela tecnica estatal de Gualeguaychú.",
  },
];

async function seed() {
  const db = getDb();
  const email = process.env.SUPERADMIN_EMAIL ?? "admin@aulaciencias.local";
  const password = requireEnv("SUPERADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 12);
  const importedTemarioRows = await loadFlatTemarioSeedRows();

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "SUPERADMIN",
      isActive: true,
    })
    .onConflictDoNothing();

  const existingSettings = await db.select({ id: appSettings.id }).from(appSettings).limit(1);

  const placeholderSettings = {
    pricePerHour: "0",
    topicsPerHour: 1,
    maxStudentsPerSlot: 1,
    primaryColor: "#0f766e",
    secondaryColor: "#1e293b",
    accentColor: "#f59e0b",
    heroImageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    backgroundImageUrl: null,
    faviconUrl: null,
    carouselImages: [
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1581093458791-9d15482442f6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
    ].join("\n"),
    educationalBackgroundImages: [
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=3200&q=82",
      "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=3200&q=82",
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=3200&q=82",
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=3200&q=82",
    ].join("\n"),
    subjectWindowIntervalSeconds: 3,
    subjectWindowRotationSeconds: "1.0",
    subjectWindowPauseSeconds: "2.0",
    subjectWindowSizeValue: "140",
    subjectWindowSizeUnit: "px",
    subjectWindowItems: null,
    whatsappNumber: null,
    siteTitle: "AulaCiencias",
    heroEyebrow: "Gualeguaychú",
    heroTitle: "Clases, recursos y reservas claras para aprender ciencias.",
    heroSubtitle:
      "Un espacio simple para encontrar material, conocer temarios, consultar colegios y reservar un horario con Silvi.",
  };

  if (existingSettings.length === 0) {
    await db.insert(appSettings).values(placeholderSettings);
  } else {
    await db
      .update(appSettings)
      .set({
        heroImageUrl: sql`COALESCE(NULLIF(${appSettings.heroImageUrl}, ''), ${placeholderSettings.heroImageUrl})`,
        carouselImages: sql`COALESCE(NULLIF(${appSettings.carouselImages}, ''), ${placeholderSettings.carouselImages})`,
        educationalBackgroundImages: sql`COALESCE(NULLIF(${appSettings.educationalBackgroundImages}, ''), ${placeholderSettings.educationalBackgroundImages})`,
        heroEyebrow: sql`COALESCE(NULLIF(${appSettings.heroEyebrow}, ''), ${placeholderSettings.heroEyebrow})`,
        heroTitle: sql`COALESCE(NULLIF(${appSettings.heroTitle}, ''), ${placeholderSettings.heroTitle})`,
        heroSubtitle: sql`COALESCE(NULLIF(${appSettings.heroSubtitle}, ''), ${placeholderSettings.heroSubtitle})`,
      })
      .where(eq(appSettings.id, existingSettings[0].id));
  }

  for (const category of initialDownloadableCategories) {
    await db
      .insert(downloadableCategories)
      .values(category)
      .onConflictDoUpdate({
        target: downloadableCategories.slug,
        set: { name: category.name },
      });
  }

  for (const subject of initialSubjects) {
    await db
      .insert(subjects)
      .values(subject)
      .onConflictDoUpdate({
        target: subjects.slug,
        set: {
          name: subject.name,
          description: subject.description,
          displayOrder: subject.displayOrder,
          isVisible: true,
        },
      });
  }

  for (const [index, subject] of bookingSubjectCatalog.entries()) {
    await db
      .insert(subjects)
      .values({
        name: subject.name,
        slug: subject.slug,
        description: subject.description,
        displayOrder: 10 + index * 10,
        isVisible: true,
      })
      .onConflictDoUpdate({
        target: subjects.slug,
        set: {
          name: subject.name,
          description: subject.description,
          displayOrder: 10 + index * 10,
          isVisible: true,
        },
      });
  }

  const seededSubjects = await db.select({ id: subjects.id, slug: subjects.slug, name: subjects.name }).from(subjects);
  const subjectBySlug = new Map(seededSubjects.map((subject) => [subject.slug, subject]));
  const subjectByName = new Map(
    seededSubjects.flatMap((subject) => [
      [subject.name, subject] as const,
      [normalizeSeedKey(subject.name), subject] as const,
    ]),
  );
  const seededCategories = await db
    .select({ id: downloadableCategories.id, slug: downloadableCategories.slug })
    .from(downloadableCategories);
  const categoryBySlug = new Map(seededCategories.map((category) => [category.slug, category]));
  const bookingTemarioRows = importedTemarioRows.flatMap((row) => {
    const educationLevel = displayLevel(row);

    if (!shouldListBookingTopicsForLevel(educationLevel)) {
      return [];
    }

    return canonicalBookingSubjectNames(row.subject).map((subjectName) => ({ row, subjectName }));
  });

  for (const slot of initialBookingTimeSlots) {
    await db
      .insert(bookingTimeSlots)
      .values({
        startTime: `${slot}:00`,
        label: slot,
        displayOrder: (initialBookingTimeSlots.indexOf(slot) + 1) * 10,
      })
      .onConflictDoNothing();
  }

  await db.update(bookingFilterOptions).set({ isVisible: false, updatedAt: new Date() });

  const bookingFilterByKey = new Map<string, string>();
  const existingBookingFilterOptions = await db
    .select({
      id: bookingFilterOptions.id,
      kind: bookingFilterOptions.kind,
      label: bookingFilterOptions.label,
      parentId: bookingFilterOptions.parentId,
    })
    .from(bookingFilterOptions);

  existingBookingFilterOptions.forEach((option) => {
    bookingFilterByKey.set(`${option.kind}|${option.parentId ?? ""}|${option.label}`, option.id);
  });

  async function ensureBookingFilterOption(kind: "level" | "year" | "track", label: string, parentId: string | null, displayOrder: number) {
    const key = `${kind}|${parentId ?? ""}|${label}`;
    const existingId = bookingFilterByKey.get(key);

    if (existingId) {
      await db
        .update(bookingFilterOptions)
        .set({ displayOrder, isVisible: true, updatedAt: new Date() })
        .where(eq(bookingFilterOptions.id, existingId));
      return existingId;
    }

    const conditions = [
      eq(bookingFilterOptions.kind, kind),
      eq(bookingFilterOptions.label, label),
      parentId ? eq(bookingFilterOptions.parentId, parentId) : isNull(bookingFilterOptions.parentId),
    ];
    const [existing] = await db
      .select({ id: bookingFilterOptions.id })
      .from(bookingFilterOptions)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      bookingFilterByKey.set(key, existing.id);
      await db
        .update(bookingFilterOptions)
        .set({ displayOrder, isVisible: true, updatedAt: new Date() })
        .where(eq(bookingFilterOptions.id, existing.id));
      return existing.id;
    }

    const [created] = await db
      .insert(bookingFilterOptions)
      .values({ kind, label, parentId, displayOrder, isVisible: true })
      .returning({ id: bookingFilterOptions.id });

    bookingFilterByKey.set(key, created.id);
    return created.id;
  }

  const levelOrder = [...bookingAvailableLevels];
  const levelIds = new Map<string, string>();
  const importedLevels = [...bookingAvailableLevels].sort((a, b) => {
    const left = levelOrder.indexOf(a);
    const right = levelOrder.indexOf(b);

    return (left === -1 ? 999 : left) - (right === -1 ? 999 : right) || a.localeCompare(b, "es-AR");
  });

  for (const [levelIndex, level] of importedLevels.entries()) {
    const id = await ensureBookingFilterOption("level", level, null, (levelIndex + 1) * 10);
    levelIds.set(level, id);
  }

  const yearIds = new Map<string, string>();
  const importedYears = Array.from(
    new Set(
      bookingTemarioRows
        .flatMap(({ row }) => {
          const level = displayLevel(row);
          return displayYears(row).map((year) => (year ? `${level}|${year}` : ""));
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "es-AR", { numeric: true }));

  for (const [yearIndex, key] of importedYears.entries()) {
    const [level, year] = key.split("|");
    const parentId = levelIds.get(level);

    if (!parentId) continue;

    const id = await ensureBookingFilterOption("year", year, parentId, (yearIndex + 1) * 10);
    yearIds.set(key, id);
  }

  const importedTracks = Array.from(
    new Set(
      bookingTemarioRows
        .flatMap(({ row }) => {
          const track = displayTrack(row);

          if (!track) return [""];

          const level = displayLevel(row);
          return displayYears(row).map((year) => `${level}|${year ?? ""}|${track}`);
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "es-AR", { numeric: true }));

  for (const [trackIndex, key] of importedTracks.entries()) {
    const [level, year, track] = key.split("|");
    const parentId = (year ? yearIds.get(`${level}|${year}`) : null) ?? levelIds.get(level);

    if (!parentId) continue;

    await ensureBookingFilterOption("track", track, parentId, (trackIndex + 1) * 10);
  }

  for (const block of initialContentBlocks) {
    await db
      .insert(contentBlocks)
      .values(block)
      .onConflictDoUpdate({
        target: contentBlocks.key,
        set: {
          title: block.title ?? null,
          eyebrow: block.eyebrow ?? null,
          body: block.body ?? null,
          imageUrl: block.imageUrl ?? null,
          displayOrder: block.displayOrder,
          isVisible: true,
        },
      });
  }

  for (const downloadable of initialDownloadables) {
    const category = categoryBySlug.get(downloadable.categorySlug);
    const { categorySlug: _categorySlug, displayOrder: _displayOrder, ...values } = downloadable;

    if (!category) {
      continue;
    }

    const [existingDownloadable] = await db
      .select({ id: downloadableContents.id })
      .from(downloadableContents)
      .where(eq(downloadableContents.title, downloadable.title))
      .limit(1);

    if (existingDownloadable) {
      await db
        .update(downloadableContents)
        .set({
          ...values,
          categoryId: category.id,
          isVisible: true,
        })
        .where(eq(downloadableContents.id, existingDownloadable.id));
    } else {
      await db.insert(downloadableContents).values({
        ...values,
        categoryId: category.id,
        isVisible: true,
      });
    }
  }

  for (const title of legacyDownloadableTitlesToHide) {
    await db
      .update(downloadableContents)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(downloadableContents.title, title));
  }

  for (const highlight of initialSubjectHighlights) {
    const subject = subjectBySlug.get(highlight.subjectSlug);
    const { subjectSlug: _subjectSlug, ...values } = highlight;

    await db
      .insert(subjectHighlights)
      .values({
        ...values,
        subjectId: subject?.id ?? null,
      })
      .onConflictDoUpdate({
        target: subjectHighlights.slug,
        set: {
          ...values,
          subjectId: subject?.id ?? null,
          isVisible: true,
        },
      });
  }

  const glossaryArticlesBySlug = new Map<string, string>();

  for (const highlight of initialSubjectHighlights) {
    const [topic] = await db
      .insert(glossaryTopics)
      .values({
        title: highlight.title,
        slug: highlight.slug,
        shortDescription: highlight.definition,
        imageUrl: highlight.imageUrl,
        displayOrder: highlight.displayOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: glossaryTopics.slug,
        set: {
          title: highlight.title,
          shortDescription: highlight.definition,
          imageUrl: highlight.imageUrl,
          displayOrder: highlight.displayOrder,
          isActive: true,
        },
      })
      .returning({ id: glossaryTopics.id, slug: glossaryTopics.slug });

    const articleValues = {
      topicId: topic.id,
      title: highlight.title,
      summary: highlight.definition,
      fullDefinition: `${highlight.definition}\n\nEste artículo funciona como punto de partida para estudiar el concepto, reconocer sus usos y conectarlo con temas escolares y profesionales.`,
      introduction: `Antes de estudiar ${highlight.title}, conviene ubicarlo dentro de las ciencias y pensar qué problemas ayuda a resolver.`,
      body: `Ideas clave: ${highlight.keywords}. Profesiones relacionadas: ${highlight.professions}. Trabajos comunes: ${highlight.jobs}.`,
      examples: highlight.keywords,
      commonMistakes: "Memorizar palabras sin relacionarlas con ejemplos; confundir definiciones breves con comprensión profunda.",
      applications: highlight.jobs,
      relatedConcepts: highlight.keywords,
      conclusion: `${highlight.title} se entiende mejor cuando se lo conecta con ejemplos, imágenes, problemas y aplicaciones reales.`,
      seoTitle: `${highlight.title} - Glosario aulaCiencias`,
      seoDescription: highlight.definition,
      keywords: highlight.keywords,
      ogImageUrl: highlight.imageUrl,
      isActive: true,
    };
    const [existingArticle] = await db
      .select({ id: glossaryArticles.id })
      .from(glossaryArticles)
      .where(eq(glossaryArticles.topicId, topic.id))
      .limit(1);
    const [article] = existingArticle
      ? await db
          .update(glossaryArticles)
          .set(articleValues)
          .where(eq(glossaryArticles.id, existingArticle.id))
          .returning({ id: glossaryArticles.id })
      : await db.insert(glossaryArticles).values(articleValues).returning({ id: glossaryArticles.id });

    glossaryArticlesBySlug.set(topic.slug, article.id);

    const levels = [
      ["Nivel inicial / primaria", `Una forma simple de entender ${highlight.title}: ${highlight.definition}`],
      ["Secundario básico", `En secundaria, ${highlight.title} se estudia mediante vocabulario, ejemplos y problemas guiados.`],
      ["Secundario avanzado", `En un nivel avanzado se analizan relaciones, modelos, evidencias y aplicaciones de ${highlight.title}.`],
      ["Terciario / universitario introductorio", `En estudios superiores, ${highlight.title} se conecta con métodos, datos y decisiones profesionales.`],
    ];

    const [existingLevel] = await db
      .select({ id: glossaryArticleLevels.id })
      .from(glossaryArticleLevels)
      .where(eq(glossaryArticleLevels.articleId, article.id))
      .limit(1);
    if (!existingLevel) {
      for (const [index, level] of levels.entries()) {
        await db.insert(glossaryArticleLevels).values({
          articleId: article.id,
          levelName: level[0],
          levelOrder: index + 1,
          content: level[1],
          examples: highlight.keywords,
          isActive: true,
        });
      }
    }

    const [existingSource] = await db
      .select({ id: glossaryArticleSources.id })
      .from(glossaryArticleSources)
      .where(eq(glossaryArticleSources.articleId, article.id))
      .limit(1);
    if (!existingSource) {
      await db.insert(glossaryArticleSources).values({
        articleId: article.id,
        title: "Contenido inicial aulaCiencias derivado de destacados existentes",
        institution: "aulaCiencias",
        sourceType: "seed interno",
        accessDate: verifiedAt,
        displayOrder: 1,
        isActive: true,
      });
    }
  }

  const articleIds = Array.from(glossaryArticlesBySlug.values());
  for (const [index, articleId] of articleIds.entries()) {
    const relatedArticleId = articleIds[(index + 1) % articleIds.length];

    if (articleId !== relatedArticleId) {
      const [existingRelation] = await db
        .select({ id: glossaryArticleRelatedTopics.id })
        .from(glossaryArticleRelatedTopics)
        .where(
          and(
            eq(glossaryArticleRelatedTopics.articleId, articleId),
            eq(glossaryArticleRelatedTopics.relatedArticleId, relatedArticleId),
          ),
        )
        .limit(1);

      if (!existingRelation) {
        await db.insert(glossaryArticleRelatedTopics).values({
          articleId,
          relatedArticleId,
          relationLabel: "Tema relacionado",
        });
      }
    }
  }

  for (const topic of commonTopics) {
    const subject = topic.subject
      ? subjectByName.get(topic.subject) ?? subjectByName.get(normalizeSeedKey(topic.subject))
      : null;
    const [existingTopic] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.title, topic.title), eq(topics.subject, topic.subject)))
      .limit(1);

    if (!existingTopic) {
      await db.insert(topics).values({
        ...topic,
        subjectId: subject?.id ?? null,
        isVisible: true,
      });
    }
  }

  await db.update(topics).set({ isVisible: false, updatedAt: new Date() }).where(like(topics.importance, "Estado:%"));

  for (const { row, subjectName } of bookingTemarioRows) {
    const title = importedTopicTitle(row);
    const educationLevel = displayLevel(row);
    const educationTrack = displayTrack(row);
    const relatedCareers = [row.institucion, row.carrera].filter(Boolean).join(" · ") || null;
    const subject = subjectByName.get(subjectName) ?? subjectByName.get(normalizeSeedKey(subjectName));

    for (const schoolYear of displayYears(row)) {
      const values = {
        title,
        introduction: row.axis ? `Eje: ${row.axis}` : null,
        importance: importedTopicNotes(row) || null,
        subject: subjectName,
        subjectId: subject?.id ?? null,
        educationLevel,
        educationTrack,
        schoolYear,
        relatedCareers,
        estimatedMinutes: 60,
        isVisible: true,
        updatedAt: new Date(),
      };
      const [existingTopic] = await db
        .select({ id: topics.id })
        .from(topics)
        .where(
          and(
            eq(topics.title, title),
            eq(topics.subject, subjectName),
            eq(topics.educationLevel, educationLevel),
            schoolYear ? eq(topics.schoolYear, schoolYear) : isNull(topics.schoolYear),
            educationTrack ? eq(topics.educationTrack, educationTrack) : isNull(topics.educationTrack),
            relatedCareers ? eq(topics.relatedCareers, relatedCareers) : isNull(topics.relatedCareers),
          ),
        )
        .limit(1);

      if (existingTopic) {
        await db.update(topics).set(values).where(eq(topics.id, existingTopic.id));
      } else {
        await db.insert(topics).values(values);
      }
    }
  }

  for (const school of gualeguaychuSchools) {
    const [existingSchool] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.name, school.name))
      .limit(1);

    const values = {
      ...school,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${school.name} ${school.address}`,
      )}`,
      isVisible: true,
    };

    if (existingSchool) {
      continue;
    } else {
      await db.insert(schools).values(values);
    }
  }

  for (const institution of initialInstitutions) {
    const { programs, ...institutionValues } = institution;
    const [existingInstitution] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.name, institution.name))
      .limit(1);
    const [savedInstitution] = existingInstitution
      ? await db
          .update(institutions)
          .set({ ...institutionValues, isActive: true })
          .where(eq(institutions.id, existingInstitution.id))
          .returning({ id: institutions.id })
      : await db.insert(institutions).values({ ...institutionValues, isActive: true }).returning({ id: institutions.id });

    for (const program of programs) {
      const { topics: programTopicNames, ...programValues } = program;
      const [existingProgram] = await db
        .select({ id: academicPrograms.id })
        .from(academicPrograms)
        .where(and(eq(academicPrograms.institutionId, savedInstitution.id), eq(academicPrograms.name, program.name)))
        .limit(1);
      const [savedProgram] = existingProgram
        ? await db
            .update(academicPrograms)
            .set({
              ...programValues,
              institutionId: savedInstitution.id,
              sourceName: institution.sourceName,
              sourceUrl: institution.sourceUrl,
              lastVerifiedAt: verifiedAt,
              isActive: true,
            })
            .where(eq(academicPrograms.id, existingProgram.id))
            .returning({ id: academicPrograms.id })
        : await db
            .insert(academicPrograms)
            .values({
              ...programValues,
              institutionId: savedInstitution.id,
              sourceName: institution.sourceName,
              sourceUrl: institution.sourceUrl,
              lastVerifiedAt: verifiedAt,
              isActive: true,
            })
            .returning({ id: academicPrograms.id });

      for (const [index, topicName] of programTopicNames.entries()) {
        const normalizedName = seedSlug(topicName);
        const [existingProgramTopic] = await db
          .select({ id: programTopics.id })
          .from(programTopics)
          .where(and(eq(programTopics.programId, savedProgram.id), eq(programTopics.normalizedName, normalizedName)))
          .limit(1);

        if (!existingProgramTopic) {
          await db.insert(programTopics).values({
            programId: savedProgram.id,
            name: topicName,
            normalizedName,
            displayOrder: index + 1,
          });
        }
      }
    }
  }

  console.log(`Seed completed for SUPERADMIN ${email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
