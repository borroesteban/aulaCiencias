export const bookingSubjectCatalog = [
  {
    name: "Matemática",
    slug: "matematica",
    description: "Temas de números, álgebra, funciones, geometría, estadística y probabilidad.",
    aliases: ["matematica"],
  },
  {
    name: "Física",
    slug: "fisica",
    description: "Temas de movimiento, fuerzas, energía, ondas, electricidad y modelos físicos.",
    aliases: ["fisica"],
  },
  {
    name: "Química",
    slug: "quimica",
    description: "Temas de materia, sustancias, reacciones, soluciones, laboratorio y química aplicada.",
    aliases: ["quimica"],
  },
  {
    name: "Biología",
    slug: "biologia",
    description: "Temas de seres vivos, células, genética, evolución, salud y ambiente.",
    aliases: ["biologia"],
  },
  {
    name: "Ciencias Naturales",
    slug: "ciencias-naturales",
    description: "Temas integrados de ciencias naturales, ciencias de la Tierra, ambiente y ecología.",
    aliases: ["ciencias naturales", "ciencias de la tierra", "introduccion a la investigacion en ciencias naturales", "ecologia"],
  },
] as const;

export const bookingAvailableLevels = ["Primaria", "Secundaria", "Terciaria", "Universitaria"] as const;
export const bookingCatalogTopicLevels = ["Primaria", "Secundaria"] as const;

export const bookingSubjectNames = bookingSubjectCatalog.map((subject) => subject.name);
export const bookingSubjectSlugs = bookingSubjectCatalog.map((subject) => subject.slug);

export function normalizeBookingCatalogText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function aliasMatchesSubject(normalizedSubject: string, alias: string) {
  return normalizedSubject === alias || normalizedSubject.startsWith(`${alias} `);
}

export function canonicalBookingSubjectNames(value: string | null | undefined) {
  const normalizedSubject = normalizeBookingCatalogText(value);

  if (!normalizedSubject) {
    return [];
  }

  if (normalizedSubject === "fisica y quimica") {
    return ["Física", "Química"];
  }

  const subject = bookingSubjectCatalog.find((item) =>
    item.aliases.some((alias) => aliasMatchesSubject(normalizedSubject, normalizeBookingCatalogText(alias))),
  );

  return subject ? [subject.name] : [];
}

export function canonicalBookingSubjectName(value: string | null | undefined) {
  return canonicalBookingSubjectNames(value)[0] ?? null;
}

export function isBookingAvailableLevel(value: string | null | undefined) {
  return bookingAvailableLevels.includes(value as (typeof bookingAvailableLevels)[number]);
}

export function shouldListBookingTopicsForLevel(value: string | null | undefined) {
  return bookingCatalogTopicLevels.includes(value as (typeof bookingCatalogTopicLevels)[number]);
}
