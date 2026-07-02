import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, WheelEvent } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import { AdminApp } from "./admin";
import { FamilySummary } from "./components/FamilySummary";
import { FloatingWhatsappButton } from "./components/FloatingWhatsappButton";
import { StudentPanel } from "./components/StudentPanel";
import "leaflet/dist/leaflet.css";
import "./styles.css";

type LoadState = "idle" | "loading" | "ready" | "error";

interface Downloadable {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  isFeatured?: boolean;
  createdAt: string;
}

interface DownloadableDetail {
  item: Downloadable;
  related: Downloadable[];
}

interface DownloadableCarouselCard {
  instanceId: string;
  item: Downloadable;
}

interface Topic {
  id: string;
  title: string;
  introduction: string | null;
  importance: string | null;
  subject: string | null;
  subjectId?: string | null;
  educationLevel: string | null;
  educationTrack: string | null;
  schoolYear: string | null;
  relatedCareers: string | null;
  estimatedMinutes: number;
}

interface CustomBookingTopic {
  clientId: string;
  title: string;
  subjectId: string | null;
  subject: string | null;
  educationLevel: string | null;
  schoolYear: string | null;
  educationTrack: string | null;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}

interface BookingFilterOption {
  id: string;
  kind: "level" | "year" | "track";
  label: string;
  parentId: string | null;
  displayOrder: number;
}

interface School {
  id: string;
  name: string;
  level: string | null;
  managementType: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: string | null;
  longitude: string | null;
  mapUrl: string | null;
  website: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  generalInfo: string | null;
}

interface PublicSettings {
  pricePerHour: string;
  topicsPerHour: number;
  maxStudentsPerSlot: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  heroImageUrl: string | null;
  backgroundImageUrl: string | null;
  faviconUrl: string | null;
  carouselImages: string | null;
  educationalBackgroundImages: string | null;
  subjectWindowIntervalSeconds: number;
  subjectWindowRotationSeconds: number;
  subjectWindowPauseSeconds: number;
  subjectWindowSizeValue: number;
  subjectWindowSizeUnit: "px" | "cm";
  subjectWindowItems: string | null;
  whatsappNumber: string;
  siteTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string | null;
}

interface BookingTimeSlot {
  id: string;
  startTime: string;
  label: string;
}

type BookingObjectiveId =
  | "preparar_examen"
  | "rendir_previa"
  | "acompanamiento"
  | "resolver_trabajos_practicos"
  | "ingreso_facultad"
  | "ingreso_profesorado"
  | "duda_puntual";

type BookingModality = "virtual" | "presencial";
type BookingClassType = "privada" | "grupal";

interface HorarioDisponible {
  id: string;
  startTime: string;
  label: string;
}

interface SelectedBookingSchedule {
  selectedDate: string;
  startTime: string;
  endTime: string;
  packId: string | null;
}

interface PackPromocional {
  id: string;
  nombre: string;
  descripcion: string;
  cantidadClases: number;
  modalidadDisponible: BookingModality[];
  tipoClaseDisponible: BookingClassType[];
  horariosDisponibles: HorarioDisponible[];
  precio?: number;
  descuento?: number;
}

interface ContentBlock {
  id: string;
  key: string;
  title: string | null;
  eyebrow: string | null;
  body: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  dni: string | null;
  phone: string | null;
  role: "SUPERADMIN" | "ADMIN" | "USER";
  isActive: boolean;
}

interface StudentForm {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  address: string;
  responsibleName: string;
  responsibleContact: string;
}

const emptySettings: PublicSettings = {
  pricePerHour: "0",
  topicsPerHour: 1,
  maxStudentsPerSlot: 1,
  primaryColor: "#000000",
  secondaryColor: "#000000",
  accentColor: "#000000",
  heroImageUrl: null,
  backgroundImageUrl: null,
  faviconUrl: null,
  carouselImages: null,
  educationalBackgroundImages: null,
  subjectWindowIntervalSeconds: 3,
  subjectWindowRotationSeconds: 1,
  subjectWindowPauseSeconds: 2,
  subjectWindowSizeValue: 140,
  subjectWindowSizeUnit: "px",
  subjectWindowItems: null,
  whatsappNumber: "",
  siteTitle: "",
  heroEyebrow: "",
  heroTitle: "",
  heroSubtitle: null,
};

const initialStudentForm: StudentForm = {
  firstName: "",
  lastName: "",
  dni: "",
  phone: "",
  address: "",
  responsibleName: "",
  responsibleContact: "",
};

const bookingObjectiveOptions: { id: BookingObjectiveId; label: string }[] = [
  { id: "preparar_examen", label: "Preparar examen" },
  { id: "rendir_previa", label: "Rendir previa" },
  { id: "acompanamiento", label: "Acompañamiento" },
  { id: "resolver_trabajos_practicos", label: "Resolver trabajos prácticos" },
  { id: "ingreso_facultad", label: "Ingreso a facultad" },
  { id: "ingreso_profesorado", label: "Ingreso a profesorado" },
  { id: "duda_puntual", label: "Duda puntual" },
];

const bookingModalityOptions: { id: BookingModality; label: string }[] = [
  { id: "virtual", label: "Clase Virtual" },
  { id: "presencial", label: "Clase Presencial" },
];

const bookingClassTypeOptions: { id: BookingClassType; label: string; detail: string }[] = [
  { id: "privada", label: "Clase privada", detail: "mayor costo" },
  { id: "grupal", label: "Clase grupal", detail: "menor costo" },
];

const promotionalPackTemplates: Omit<PackPromocional, "horariosDisponibles">[] = [
  {
    id: "pack-mensual-4",
    nombre: "Pack mensual 4 clases",
    descripcion: "Una clase por semana para sostener el ritmo de estudio.",
    cantidadClases: 4,
    modalidadDisponible: ["virtual", "presencial"],
    tipoClaseDisponible: ["privada", "grupal"],
    descuento: 10,
  },
  {
    id: "pack-intensivo-6",
    nombre: "Pack intensivo 6 clases",
    descripcion: "Para preparar examen, previa o entrega de trabajos prácticos.",
    cantidadClases: 6,
    modalidadDisponible: ["virtual", "presencial"],
    tipoClaseDisponible: ["privada"],
    descuento: 15,
  },
  {
    id: "pack-grupal-8",
    nombre: "Pack grupal 8 clases",
    descripcion: "Opción de menor costo para acompañamiento sostenido.",
    cantidadClases: 8,
    modalidadDisponible: ["virtual", "presencial"],
    tipoClaseDisponible: ["grupal"],
    descuento: 20,
  },
];

interface SubjectWindowItem {
  id: string;
  subjectId?: string | null;
  subjectName?: string | null;
  title: string;
  slug: string;
  shortDescription?: string | null;
  keywords?: string[];
  definition?: string;
  professions?: string[];
  jobs?: string[];
  imageUrl: string;
}

interface GlossaryArticle {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  fullDefinition: string | null;
  introduction: string | null;
  body: string | null;
  examples: string[];
  counterExamples: string[];
  commonMistakes: string[];
  applications: string[];
  relatedConcepts: string[];
  conclusion: string | null;
  seoTitle?: string | null;
  imageUrl: string | null;
  wikipediaTitle?: string | null;
  wikipediaDescription?: string | null;
  wikipediaUrl?: string | null;
  levels: { id: string; levelName: string; content: string; examples: string | null }[];
  media: { id: string; type: string; title: string | null; description: string | null; url: string | null; altText: string | null }[];
  sources: { id: string; title: string; author: string | null; institution: string | null; url: string | null; sourceType: string | null; accessDate: string | null }[];
  relatedTopics: { title: string; slug: string; relationLabel: string | null }[];
}

interface StudyProgram {
  id: string;
  institutionId: string;
  name: string;
  academicLevel: string;
  titleGranted: string | null;
  duration: string | null;
  modality: string | null;
  description: string | null;
  website: string | null;
  institutionName: string;
  institutionType: string | null;
  institutionDescription: string | null;
  institutionAddress: string | null;
  institutionCity: string | null;
  institutionPhone: string | null;
  institutionEmail: string | null;
  institutionWebsite: string | null;
  institutionLatitude: string | null;
  institutionLongitude: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  topics: { id: string; name: string; normalizedName: string }[];
}

interface EducationalOffer {
  id: string;
  name: string;
  type: string;
  description: string | null;
  titleGranted?: string | null;
  duration?: string | null;
  modality?: string | null;
  website?: string | null;
}

interface UnifiedInstitution {
  id: string;
  name: string;
  type: string;
  typeKey: InstitutionTypeKey;
  typeKeys: InstitutionTypeKey[];
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: string | null;
  latitude: string | null;
  longitude: string | null;
  observations: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  educationalOffers: EducationalOffer[];
}

interface SubjectWindowCard {
  slotKey: string;
  subjectKey: string;
  title: string;
  slugTitle: string;
  imageUrl: string;
}

const subjectWindowLoopCopies = 3;

const navbarFloatItems = [
  "notebook",
  "graph",
  "pi",
  "calculator",
  "root",
  "operators",
  "triangle",
  "sigma",
  "ruler",
  "beaker",
  "pencil",
];

const subjectImagePools: Record<string, string[]> = {
  matematica: [
    "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1453733190371-0a9bedd82893?auto=format&fit=crop&w=900&q=80",
  ],
  biologia: [
    "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80",
  ],
  quimica: [
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1581093458791-9d15482442f6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1606206873764-fd15e242df52?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?auto=format&fit=crop&w=900&q=80",
  ],
  fisica: [
    "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1453733190371-0a9bedd82893?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80",
  ],
  "ciencias-naturales": [
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=900&q=80",
  ],
};
const subjectFallbackImages = Object.fromEntries(
  Object.entries(subjectImagePools).map(([key, images]) => [key, images[0]]),
) as Record<string, string>;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function bookingRequestHref(value: string) {
  return `/?solicitar=${encodeURIComponent(value)}#silvi`;
}

function downloadableHref(item: Pick<Downloadable, "id">) {
  return `/materiales/${encodeURIComponent(item.id)}`;
}

function NavbarFloatIcon({ name }: { name: string }) {
  if (name === "notebook") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M18 10h34v44H18z" />
        <path d="M24 18h20v8H24z" />
        <path d="M14 16h8M14 26h8M14 36h8M14 46h8" />
        <path d="M14 16v0M14 26v0M14 36v0M14 46v0" />
      </svg>
    );
  }

  if (name === "graph") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M12 50h42M18 54V12" />
        <path d="M17 14l-4 6M17 14l5 5M52 50l-6-4M52 50l-6 4" />
        <path d="M22 43c9-1 17-10 23-27" />
        <path d="M39 18l9-5l3 10" />
      </svg>
    );
  }

  if (name === "calculator") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M18 8h34v48H18z" />
        <path d="M24 15h20v9H24z" />
        <path d="M25 32h6M36 32h6M25 40h6M36 40h6M25 48h6M36 48h6" />
      </svg>
    );
  }

  if (name === "operators") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 12h16v16H14zM34 12h16v16H34zM14 34h16v16H14zM34 34h16v16H34z" />
        <path d="M18 20h8M22 16v8M38 20h8M18 42l8 8M26 42l-8 8M38 42h8M38 48h8" />
      </svg>
    );
  }

  if (name === "triangle") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M15 12v40h40z" />
        <path d="M25 42h17L25 25z" />
        <path d="M19 20h5M19 28h5M19 36h5M19 44h5" />
      </svg>
    );
  }

  if (name === "ruler") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M11 43l32-32l12 12l-32 32z" />
        <path d="M24 34l4 4M30 28l6 6M36 22l4 4M42 16l6 6" />
      </svg>
    );
  }

  if (name === "beaker") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M25 10h20M30 10v15L18 52h34L40 25V10" />
        <path d="M23 42h26" />
      </svg>
    );
  }

  if (name === "pencil") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M12 47l4 5l8-2l30-30l-9-9l-30 30z" />
        <path d="M39 17l9 9M16 41l8 8" />
      </svg>
    );
  }

  const symbols: Record<string, string> = {
    pi: "π",
    root: "√2",
    sigma: "Σ",
  };

  return <span className="nav-math-symbol">{symbols[name] || name}</span>;
}

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function useApiList<T>(url: string) {
  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    let isMounted = true;

    setState("loading");
    apiGet<{ items: T[] }>(url)
      .then((data) => {
        if (isMounted) {
          setItems(data.items);
          setState("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { items, state };
}

async function apiGetAll<T>(baseUrl: string, pageSize = 50): Promise<T[]> {
  const items: T[] = [];
  const separator = baseUrl.includes("?") ? "&" : "?";
  let offset = 0;

  while (true) {
    const data = await apiGet<{ items: T[]; total?: number }>(
      `${baseUrl}${separator}limit=${pageSize}&offset=${offset}`,
    );

    items.push(...data.items);

    if (data.items.length < pageSize || (typeof data.total === "number" && items.length >= data.total)) {
      return items;
    }

    offset += pageSize;
  }
}

function useApiAllList<T>(baseUrl: string) {
  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    let isMounted = true;

    setState("loading");
    apiGetAll<T>(baseUrl)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setState("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [baseUrl]);

  return { items, state };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function addHours(startTime: string, hours: number) {
  const [hour, minute] = startTime.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  date.setUTCHours(date.getUTCHours() + hours);

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}`;
}

function parseImageList(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function imageWithWidth(url: string, width: number) {
  try {
    const nextUrl = new URL(url);

    nextUrl.searchParams.set("w", String(width));
    nextUrl.searchParams.set("q", width >= 2400 ? "82" : "78");
    nextUrl.searchParams.set("auto", nextUrl.searchParams.get("auto") || "format");
    nextUrl.searchParams.set("fit", nextUrl.searchParams.get("fit") || "crop");

    return nextUrl.toString();
  } catch {
    return url;
  }
}

function selectDailyImage(images: string[]) {
  if (images.length === 0) {
    return "";
  }

  const dayIndex = Math.floor(Date.now() / 86_400_000);

  return images[dayIndex % images.length];
}

function subjectWindowRotationMs(value: number) {
  const seconds = Math.min(20, Math.max(0.5, Number(value || 1)));

  return Math.round(seconds * 1000);
}

function subjectWindowPauseToMs(value: number) {
  const seconds = Math.min(20, Math.max(0, Number(value ?? 2)));

  return Math.round(seconds * 1000);
}

function subjectWindowSize(value: number, unit: "px" | "cm") {
  const size = Math.min(500, Math.max(1, Number(value || 140)));

  return `${size}${unit === "cm" ? "cm" : "px"}`;
}

function subjectWindowKey(item: SubjectWindowItem) {
  return item.subjectId || slugify(item.subjectName || item.title);
}

function subjectWindowDisplayKey(item: SubjectWindowItem) {
  return slugify(item.title);
}

function subjectWindowTitle(item: SubjectWindowItem) {
  return item.title;
}

function subjectWindowFallbackImage(subjectKey: string, fallbackImages: string[]) {
  return subjectWindowImagePool(subjectKey, fallbackImages)[0] || "";
}

function subjectWindowImagePool(subjectKey: string, fallbackImages: string[]) {
  return uniqueValues([
    ...(subjectImagePools[subjectKey] || []),
    subjectFallbackImages[subjectKey],
    ...fallbackImages,
    ...Object.values(subjectImagePools).flat(),
  ]);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function repeatLoop<T>(items: T[]) {
  return Array.from({ length: subjectWindowLoopCopies }, () => items).flat();
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function scrollToHashTarget(hash: string) {
  if (!hash || hash.startsWith("#/")) {
    return false;
  }

  const target = document.querySelector(hash);

  if (!target) {
    return false;
  }

  target.scrollIntoView({ block: "start" });
  return true;
}

function getContentBlock(blocks: ContentBlock[], key: string) {
  return blocks.find((block) => block.key === key) ?? null;
}

function applyPublicSettings(settings: PublicSettings) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", settings.primaryColor);
  root.style.setProperty("--color-secondary", settings.secondaryColor);
  root.style.setProperty("--color-accent", settings.accentColor);
  root.style.setProperty("--page-bg-image", settings.backgroundImageUrl ? `url("${settings.backgroundImageUrl}")` : "none");
  document.title = settings.siteTitle;

  let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  if (settings.faviconUrl) {
    favicon.href = settings.faviconUrl;
  }
}

function SectionState({ state, emptyText }: { state: LoadState; emptyText?: string }) {
  if (state === "loading") {
    return <p className="muted">Cargando...</p>;
  }

  if (state === "error") {
    return <p className="error-text">No pudimos cargar esta sección. Intenta nuevamente.</p>;
  }

  if (state === "ready" && emptyText) {
    return <p className="muted">{emptyText}</p>;
  }

  return null;
}

function AdminEditLink({ isAdmin, href, label }: { isAdmin: boolean; href: string; label: string }) {
  if (!isAdmin) {
    return null;
  }

  return (
    <a className="admin-edit-link" href={href}>
      {label}
    </a>
  );
}

function App() {
  const [route, setRoute] = useState(window.location.hash);
  const [path, setPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(window.location.hash.startsWith("#/login"));
  const [downloadableCategory, setDownloadableCategory] = useState("");
  const [settings, setSettings] = useState<PublicSettings>(emptySettings);
  const [settingsState, setSettingsState] = useState<LoadState>("idle");

  useEffect(() => {
    const onRouteChange = () => {
      setRoute(window.location.hash);
      setPath(window.location.pathname);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>("a[href^='/']");

      if (!link || link.origin !== window.location.origin || link.target || link.hasAttribute("download")) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, "", link.href);
      onRouteChange();
    };

    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);
    document.addEventListener("click", onDocumentClick);

    return () => {
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (route.startsWith("#/login")) {
      setIsAuthModalOpen(true);
    }
  }, [route]);

  useEffect(() => {
    apiGet<{ user: AuthUser }>("/api/auth/me")
      .then((data) => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setCurrentUser(null);
    window.location.hash = "#inicio";
  }

  const downloadablesUrl = downloadableCategory
    ? `/api/downloadables?limit=50&categorySlug=${encodeURIComponent(downloadableCategory)}`
    : "/api/downloadables?limit=50";
  const recentDownloadables = useApiList<Downloadable>("/api/downloadables/recent?limit=8");
  const allDownloadables = useApiList<Downloadable>("/api/downloadables?limit=50");
  const downloadables = useApiList<Downloadable>(downloadablesUrl);
  const topics = useApiAllList<Topic>("/api/topics");
  const subjects = useApiList<Subject>("/api/subjects");
  const bookingFilterOptions = useApiList<BookingFilterOption>("/api/booking-filter-options");
  const schools = useApiAllList<School>("/api/schools");
  const glossaryWindows = useApiList<SubjectWindowItem>("/api/glossary/windows");
  const bookingTimeSlots = useApiList<BookingTimeSlot>("/api/booking-time-slots");
  const contentBlocks = useApiList<ContentBlock>("/api/content-blocks");

  useEffect(() => {
    setSettingsState("loading");
    apiGet<{ settings: PublicSettings }>("/api/settings/public")
      .then((data) => {
        setSettings(data.settings);
        applyPublicSettings(data.settings);
        setSettingsState("ready");
      })
      .catch(() => {
        setSettingsState("error");
      });
  }, []);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    allDownloadables.items.forEach((item) => {
      categoryMap.set(item.categorySlug, item.categoryName);
    });

    return Array.from(categoryMap, ([slug, name]) => ({ slug, name }));
  }, [allDownloadables.items]);
  const isAdmin = currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";
  const content = useMemo(
    () => ({
      subjectCarousel: getContentBlock(contentBlocks.items, "home.subjectCarousel"),
      glossaryHeader: getContentBlock(contentBlocks.items, "glossary.header"),
      downloadables: getContentBlock(contentBlocks.items, "home.downloadables"),
      topics: getContentBlock(contentBlocks.items, "home.topics"),
      schools: getContentBlock(contentBlocks.items, "home.schools"),
      booking: getContentBlock(contentBlocks.items, "home.booking"),
    }),
    [contentBlocks.items],
  );
  const carouselImages = useMemo(() => parseImageList(settings.carouselImages), [settings.carouselImages]);
  const educationalBackgroundImages = useMemo(
    () => parseImageList(settings.educationalBackgroundImages),
    [settings.educationalBackgroundImages],
  );

  useEffect(() => {
    if (path !== "/" || !route || route.startsWith("#/")) {
      return undefined;
    }

    let attempt = 0;
    const timers: number[] = [];

    function tryScroll() {
      if (scrollToHashTarget(route)) {
        return;
      }

      attempt += 1;

      if (attempt <= 10) {
        timers.push(window.setTimeout(tryScroll, 120));
      }
    }

    timers.push(window.setTimeout(tryScroll, 0));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [path, route, subjects.state, topics.state, bookingFilterOptions.state]);

  if (route.startsWith("#/admin")) {
    return <AdminApp />;
  }

  if (path.startsWith("/alumno/")) {
    const studentId = decodeURIComponent(path.replace(/^\/alumno\//, ""));

    return (
      <div>
        <header className="site-header">
          <div className="nav-float-layer" aria-hidden="true">
            {navbarFloatItems.map((item, index) => (
              <span className="nav-float-item" key={`${item}-${index}`}>
                <NavbarFloatIcon name={item} />
              </span>
            ))}
          </div>
          <a className="brand" href="/">
            {settings.siteTitle}
          </a>
          <nav aria-label="Secciones">
            <a href="/">Inicio</a>
            <a href="/#silvi">Reservar</a>
            {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
          </nav>
        </header>
        <main>
          <StudentPanel studentId={studentId} />
        </main>
        <FloatingWhatsappButton phoneNumber={settings.whatsappNumber} />
        <footer className="site-footer">
          <span>{settings.siteTitle}</span>
          {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
        </footer>
      </div>
    );
  }

  if (path.startsWith("/familia/")) {
    const studentId = decodeURIComponent(path.replace(/^\/familia\//, ""));

    return (
      <div>
        <header className="site-header">
          <div className="nav-float-layer" aria-hidden="true">
            {navbarFloatItems.map((item, index) => (
              <span className="nav-float-item" key={`${item}-${index}`}>
                <NavbarFloatIcon name={item} />
              </span>
            ))}
          </div>
          <a className="brand" href="/">
            {settings.siteTitle}
          </a>
          <nav aria-label="Secciones">
            <a href="/">Inicio</a>
            <a href="/#silvi">Reservar</a>
            {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
          </nav>
        </header>
        <main>
          <FamilySummary studentId={studentId} />
        </main>
        <FloatingWhatsappButton phoneNumber={settings.whatsappNumber} />
        <footer className="site-footer">
          <span>{settings.siteTitle}</span>
          {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
        </footer>
      </div>
    );
  }

  if (path.startsWith("/materiales/")) {
    return (
      <div>
        <header className="site-header">
          <div className="nav-float-layer" aria-hidden="true">
            {navbarFloatItems.map((item, index) => (
              <span className="nav-float-item" key={`${item}-${index}`}>
                <NavbarFloatIcon name={item} />
              </span>
            ))}
          </div>
          <a className="brand" href="/">
            {settings.siteTitle}
          </a>
          <nav aria-label="Secciones">
            <a href="/#descargables">Descargables</a>
            <a href="/">Inicio</a>
            {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
          </nav>
        </header>
        <main>
          <DownloadableDetailPage id={decodeURIComponent(path.replace(/^\/materiales\//, ""))} />
        </main>
        <FloatingWhatsappButton context={{ tema: "material descargable" }} phoneNumber={settings.whatsappNumber} />
        <footer className="site-footer">
          <span>{settings.siteTitle}</span>
          {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
        </footer>
      </div>
    );
  }

  if (path.startsWith("/glosario/")) {
    return (
      <div>
        <header className="site-header">
          <div className="nav-float-layer" aria-hidden="true">
            {navbarFloatItems.map((item, index) => (
              <span className="nav-float-item" key={`${item}-${index}`}>
                <NavbarFloatIcon name={item} />
              </span>
            ))}
          </div>
          <a className="brand" href="/">
            {settings.siteTitle}
          </a>
          <nav aria-label="Secciones">
            <a href="/">Inicio</a>
            <a href="/glosario">Glosario</a>
            {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
          </nav>
        </header>
        <main>
          <GlossaryArticlePage slug={path.replace(/^\/glosario\//, "")} />
        </main>
        <FloatingWhatsappButton context={{ tema: decodeURIComponent(path.replace(/^\/glosario\//, "")) }} phoneNumber={settings.whatsappNumber} />
        <footer className="site-footer">
          <span>{settings.siteTitle}</span>
          {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
        </footer>
      </div>
    );
  }

  if (path === "/glosario") {
    return (
      <div>
        <header className="site-header">
          <div className="nav-float-layer" aria-hidden="true">
            {navbarFloatItems.map((item, index) => (
              <span className="nav-float-item" key={`${item}-${index}`}>
                <NavbarFloatIcon name={item} />
              </span>
            ))}
          </div>
          <a className="brand" href="/">
            {settings.siteTitle}
          </a>
          <nav aria-label="Secciones">
            <a href="/">Inicio</a>
            <a href="/glosario">Glosario</a>
            {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
          </nav>
        </header>
        <main>
          <GlossarySection header={content.glossaryHeader} items={glossaryWindows.items} state={glossaryWindows.state} />
        </main>
        <FloatingWhatsappButton phoneNumber={settings.whatsappNumber} />
        <footer className="site-footer">
          <span>{settings.siteTitle}</span>
          {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
        </footer>
      </div>
    );
  }

  return (
    <div>
      <header className="site-header">
        <div className="nav-float-layer" aria-hidden="true">
          {navbarFloatItems.map((item, index) => (
            <span className="nav-float-item" key={`${item}-${index}`}>
              <NavbarFloatIcon name={item} />
            </span>
          ))}
        </div>
        <a className="brand" href="#inicio">
          {settings.siteTitle}
        </a>
        <nav aria-label="Secciones">
          <a href="#descargables">Descargables</a>
          <a href="#colegios">Colegios</a>
          <a href="#silvi">{content.booking?.eyebrow || ""}</a>
          {currentUser ? (
            <button className="nav-button" type="button" onClick={logout}>
              Salir
            </button>
          ) : (
            <button className="nav-button" type="button" onClick={() => setIsAuthModalOpen(true)}>
              Ingresar
            </button>
          )}
          {currentUser && currentUser.role !== "USER" ? <a href="#/admin">Admin</a> : null}
        </nav>
      </header>

      <main>
        <SubjectCarousel
          carouselImages={carouselImages}
          heading={content.subjectCarousel}
          items={glossaryWindows.items}
          state={glossaryWindows.state}
          rotationSeconds={settings.subjectWindowRotationSeconds ?? settings.subjectWindowIntervalSeconds}
          pauseSeconds={settings.subjectWindowPauseSeconds}
          sizeValue={settings.subjectWindowSizeValue}
          sizeUnit={settings.subjectWindowSizeUnit}
          isAdmin={isAdmin}
        />

        <EducationalBackgroundSection images={educationalBackgroundImages} isAdmin={isAdmin} />

        <section className="hero section" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">{settings.heroEyebrow}</p>
            <h1>{settings.heroTitle}</h1>
            {settings.heroSubtitle ? <p>{settings.heroSubtitle}</p> : null}
            <div className="hero-actions">
              <a className="primary-action" href="#silvi">
                Reservar clase
              </a>
              <a className="secondary-action" href="#silvi">
                Ver temarios
              </a>
              <AdminEditLink isAdmin={isAdmin} href="#/admin/settings" label="Editar portada" />
            </div>
          </div>
          <img
            className="hero-image"
            src={settings.heroImageUrl || ""}
            alt="Aula con estudiantes aprendiendo"
          />
        </section>

        <DownloadablesSection
          categories={categories}
          category={downloadableCategory}
          setCategory={setDownloadableCategory}
          recent={recentDownloadables}
          downloadables={downloadables}
          isAdmin={isAdmin}
          heading={content.downloadables}
        />

        <StudySection heading={content.schools} schools={schools} isAdmin={isAdmin} />

        <BookingSection
          heading={content.booking}
          timeSlots={bookingTimeSlots}
          topics={topics.items}
          topicsState={topics.state}
          subjects={subjects.items}
          subjectsState={subjects.state}
          bookingFilterOptions={bookingFilterOptions.items}
          bookingFilterOptionsState={bookingFilterOptions.state}
          settings={settings}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      </main>

      <footer className="site-footer">
        <span>{settings.siteTitle}</span>
        {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
      </footer>
      <FloatingWhatsappButton phoneNumber={settings.whatsappNumber} />
      {isAuthModalOpen ? (
        <AuthModal
          currentUser={currentUser}
          onAuth={setCurrentUser}
          onClose={() => setIsAuthModalOpen(false)}
          onLogout={logout}
        />
      ) : null}
    </div>
  );
}

function SubjectCarousel({
  carouselImages,
  heading,
  items,
  state,
  rotationSeconds,
  pauseSeconds,
  sizeValue,
  sizeUnit,
  isAdmin,
}: {
  carouselImages: string[];
  heading: ContentBlock | null;
  items: SubjectWindowItem[];
  state: LoadState;
  rotationSeconds: number;
  pauseSeconds: number;
  sizeValue: number;
  sizeUnit: "px" | "cm";
  isAdmin: boolean;
}) {
  const [windowRows, setWindowRows] = useState<SubjectWindowCard[][]>([]);
  const [flippingSlots, setFlippingSlots] = useState<number[]>([]);
  const [flipModes, setFlipModes] = useState<Record<number, "x" | "y">>({});
  const subjectItems = useMemo(() => {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = subjectWindowDisplayKey(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [items]);
  const imagesBySubject = useMemo(() => {
    const groups = new Map<string, string[]>();

    items.forEach((item) => {
      const key = subjectWindowKey(item);
      const images = groups.get(key) || [];

      if (item.imageUrl && !images.includes(item.imageUrl)) {
        images.push(item.imageUrl);
      }

      groups.set(key, images);
    });

    return groups;
  }, [items]);
  const rotationMs = subjectWindowRotationMs(rotationSeconds);
  const pauseMs = subjectWindowPauseToMs(pauseSeconds);
  const windowSize = subjectWindowSize(sizeValue, sizeUnit);
  const rowCount = 2;
  const windowsPerRow = 14;
  const allImages = useMemo(
    () =>
      uniqueValues([
        ...items.map((item) => item.imageUrl),
        ...carouselImages,
        ...Object.values(subjectImagePools).flat(),
      ]),
    [carouselImages, items],
  );

  function pickImage(subjectKey: string, preferredImages: string[], usedImages: Set<string>) {
    const pool = uniqueValues([
      ...preferredImages,
      ...subjectWindowImagePool(subjectKey, allImages),
    ]);
    const nextImage = pool.find((image) => !usedImages.has(image)) || pool[0] || "";

    if (nextImage) {
      usedImages.add(nextImage);
    }

    return nextImage;
  }

  const initialWindowRows = useMemo(() => {
    if (subjectItems.length === 0) {
      return [];
    }

    const usedImages = new Set<string>();

    const visibleSubjects = subjectItems.slice(0, rowCount * windowsPerRow);

    return Array.from({ length: rowCount }, (_, rowIndex) =>
      visibleSubjects
        .filter((_, index) => index % rowCount === rowIndex)
        .map((subject, index) => {
          const subjectKey = subjectWindowKey(subject);
          const images = imagesBySubject.get(subjectKey) || [];

          return {
            slotKey: `subject-window-${rowIndex}-${index}`,
            subjectKey,
            title: subjectWindowTitle(subject),
            slugTitle: subject.slug || slugify(subject.title),
            imageUrl: pickImage(subjectKey, images, usedImages),
          };
        }),
    ).filter((row) => row.length > 0);
  }, [allImages, imagesBySubject, subjectItems]);

  useEffect(() => {
    if (subjectItems.length === 0) {
      setWindowRows([]);
      setFlippingSlots([]);
      return;
    }

    const timers: number[] = [];
    let isCancelled = false;
    const nextRows = initialWindowRows;
    const totalWindows = nextRows.reduce((total, row) => total + row.length, 0);
    setWindowRows(nextRows);

    function createNextCard(currentCard: SubjectWindowCard, usedImages: Set<string>) {
      const differentSubjectItems = subjectItems.filter((subject) => {
        const subjectKey = subjectWindowKey(subject);
        const slugTitle = subject.slug || slugify(subject.title);

        return subjectKey !== currentCard.subjectKey && slugTitle !== currentCard.slugTitle;
      });
      const differentLinkItems = subjectItems.filter((subject) => {
        const title = subjectWindowTitle(subject);
        const slugTitle = subject.slug || slugify(subject.title);

        return title !== currentCard.title && slugTitle !== currentCard.slugTitle;
      });
      const candidates = differentSubjectItems.length > 0 ? differentSubjectItems : differentLinkItems;
      const nextSubject = candidates[Math.floor(Math.random() * candidates.length)];

      if (!nextSubject) {
        return currentCard;
      }

      const subjectKey = subjectWindowKey(nextSubject);
      const images = imagesBySubject.get(subjectKey) || [];
      const imageUrl = pickImage(subjectKey, images, usedImages);

      return {
        slotKey: currentCard.slotKey,
        subjectKey,
        title: subjectWindowTitle(nextSubject),
        slugTitle: nextSubject.slug || slugify(nextSubject.title),
        imageUrl,
      };
    }

    function replaceSlotAtMidFlip(slot: number) {
      setWindowRows((currentRows) => {
        let remainingSlot = slot;
        let wasReplaced = false;
        const usedImages = new Set(currentRows.flat().map((card) => card.imageUrl).filter(Boolean));

        return currentRows.map((row) => {
          if (wasReplaced) {
            return row;
          }

          if (remainingSlot >= row.length) {
            remainingSlot -= row.length;
            return row;
          }

          wasReplaced = true;

          return row.map((card, index) => {
            if (index !== remainingSlot) {
              return card;
            }

            usedImages.delete(card.imageUrl);
            return createNextCard(card, usedImages);
          });
        });
      });
    }

    function flipSlot(slot: number) {
      if (isCancelled) {
        return;
      }

      setFlipModes((current) => ({ ...current, [slot]: Math.random() > 0.5 ? "x" : "y" }));
      setFlippingSlots((current) => (current.includes(slot) ? current : [...current, slot]));
      timers.push(window.setTimeout(() => {
        replaceSlotAtMidFlip(slot);
      }, Math.round(rotationMs / 2)));

      timers.push(window.setTimeout(() => {
        setFlippingSlots((current) => current.filter((item) => item !== slot));
      }, rotationMs));
    }

    function scheduleBatch(delay: number) {
      timers.push(window.setTimeout(() => {
        if (isCancelled || totalWindows === 0) {
          return;
        }

        const batchSize = Math.min(totalWindows, Math.floor(Math.random() * 3) + 1);
        const slots = Array.from({ length: totalWindows }, (_, slot) => slot).sort(() => Math.random() - 0.5);

        slots.slice(0, batchSize).forEach((slot, index) => {
          timers.push(window.setTimeout(() => {
            flipSlot(slot);
          }, index * 120));
        });

        const nextPause = Math.max(650, batchSize === 1 ? pauseMs * 0.42 : pauseMs * 0.75) + Math.round(Math.random() * 350);
        scheduleBatch(rotationMs + nextPause);
      }, delay));
    }

    scheduleBatch(650);

    if (totalWindows > 0) {
      const starterSlots = Array.from({ length: totalWindows }, (_, slot) => slot).sort(() => Math.random() - 0.5).slice(0, 2);

      starterSlots.forEach((slot, index) => {
        timers.push(window.setTimeout(() => {
          flipSlot(slot);
        }, index * 450));
      });
    }

    return () => {
      isCancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      setFlippingSlots([]);
    };
  }, [imagesBySubject, initialWindowRows, pauseMs, rotationMs, subjectItems]);

  const backgroundImages = uniqueValues(initialWindowRows.flat().map((item) => item.imageUrl));

  return (
    <section
      className="subject-carousel-section"
      aria-labelledby="materias-title"
      style={{ "--subject-window-size": windowSize } as CSSProperties}
    >
      <div className="subject-window-background" aria-hidden="true">
        <div className="subject-window-background-track">
          {repeatLoop(backgroundImages).map((image, index) => (
            <span className="subject-window-background-tile" key={`${image}-${index}`}>
              <img src={image} alt="" loading="eager" decoding="async" />
            </span>
          ))}
        </div>
      </div>
      <div className="section-heading subject-carousel-heading">
        <h2 id="materias-title">{heading?.title || "Ventanas de glosario"}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/subject-highlights" label="Editar carrusel" />
      </div>

      <div
        className="subject-window-carousel"
        aria-label="Ventanas de glosario"
      >
        <div className="subject-window-foreground">
        {windowRows.map((rowItems, rowIndex) => (
          <div className="subject-window-row" key={`subject-row-${rowIndex}`}>
            <div className="subject-window-track">
              {repeatLoop(rowItems).map((item, index) => {
                const rowOffset = windowRows
                  .slice(0, rowIndex)
                  .reduce((total, row) => total + row.length, 0);
                const slot = rowOffset + (index % Math.max(1, rowItems.length));

                return (
                  <a
                    className={`subject-window ${flippingSlots.includes(slot) ? `flipping flip-${flipModes[slot] || "y"}` : ""}`}
                    href={`/glosario/${item.slugTitle}`}
                    key={`${item.slotKey}-${index}`}
                    style={{ "--subject-window-duration": `${rotationMs}ms` } as CSSProperties}
                  >
                    <div className="subject-window-inner">
                      <img
                        src={item.imageUrl || carouselImages[index % carouselImages.length] || ""}
                        alt={item.title}
                        loading="eager"
                        decoding="async"
                        onError={(event) => {
                          const fallback = subjectWindowFallbackImage(item.subjectKey, carouselImages);

                          if (fallback && event.currentTarget.src !== fallback) {
                            event.currentTarget.src = fallback;
                          }
                        }}
                      />
                      <div>
                        <h3>{item.title}</h3>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
        </div>
        <SectionState state={state} emptyText={items.length === 0 ? "No hay campos publicados todavía." : undefined} />
      </div>

    </section>
  );
}

function EducationalBackgroundSection({ images, isAdmin }: { images: string[]; isAdmin: boolean }) {
  const selectedImage = selectDailyImage(images);

  if (!selectedImage) {
    return null;
  }

  return (
    <section
      className="educational-background-section"
      style={{ "--educational-bg-image": `url("${imageWithWidth(selectedImage, 2400)}")` } as CSSProperties}
      aria-label="Escena educativa"
    >
      <picture className="educational-background-picture" aria-hidden="true">
        <source media="(max-width: 640px)" srcSet={imageWithWidth(selectedImage, 1200)} />
        <source media="(max-width: 1100px)" srcSet={imageWithWidth(selectedImage, 1800)} />
        <img
          src={imageWithWidth(selectedImage, 2400)}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </picture>
      <div className="educational-background-overlay">
        <div className="educational-background-copy">
          <span className="eyebrow">Aprender ciencias</span>
          <h2>Un fondo vivo para estudiar, preguntar y practicar.</h2>
          <AdminEditLink isAdmin={isAdmin} href="#/admin/settings" label="Editar fondo" />
        </div>
      </div>
    </section>
  );
}

function GlossarySection({
  header,
  items,
  state,
}: {
  header: ContentBlock | null;
  items: SubjectWindowItem[];
  state: LoadState;
}) {
  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    window.setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ block: "start" });
    }, 0);
  }, [items]);

  return (
    <section className="section glossary-section">
      <div className="section-heading">
        <h1>{header?.title || ""}</h1>
        {header?.body ? <p>{header.body}</p> : null}
      </div>
      <div className="subject-definition-grid">
        {items.map((item) => (
          <article className="subject-definition" id={`materia-${item.slug || slugify(item.title)}`} key={item.title}>
            <span className="tag">{item.title}</span>
            <h3>{item.title}</h3>
            <p>{item.shortDescription || item.definition}</p>
            <div className="definition-actions">
              <a className="text-action" href={`/glosario/${item.slug || slugify(item.title)}`}>
                Leer artículo completo
              </a>
              <a className="secondary-action" href="/">
                Volver al inicio
              </a>
              <a className="primary-action" href={bookingRequestHref(item.slug || item.title)}>
                Solicitar clase sobre este tema
              </a>
            </div>
          </article>
        ))}
      </div>
      <SectionState state={state} emptyText={items.length === 0 ? "No hay definiciones publicadas todavía." : undefined} />
    </section>
  );
}

function GlossaryArticlePage({ slug }: { slug: string }) {
  const [article, setArticle] = useState<GlossaryArticle | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    apiGet<{ article: GlossaryArticle }>(`/api/glossary/articles/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!isMounted) return;
        setArticle(data.article);
        document.title = data.article.seoTitle || `${data.article.title} - AulaCiencias`;
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (state === "loading") {
    return <section className="section"><p className="muted">Cargando artículo...</p></section>;
  }

  if (!article) {
    return (
      <section className="section">
        <h1>Artículo no encontrado</h1>
        <p className="muted">No encontramos esa definición en el glosario.</p>
        <a className="secondary-action" href="/glosario">Volver al glosario</a>
      </section>
    );
  }

  const wikipediaSource = article.sources.find((source) => source.institution === "Wikipedia" && source.url);
  const wikipediaUrl = article.wikipediaUrl || wikipediaSource?.url || null;
  const wikipediaTitle = article.wikipediaTitle || article.title;

  return (
    <article className="section glossary-article-page">
      <div className="glossary-article-hero">
        <div>
          <p className="eyebrow">Glosario</p>
          <h1>{article.title}</h1>
          {article.summary ? <p>{article.summary}</p> : null}
          <div className="definition-actions">
            <a className="primary-action" href={bookingRequestHref(article.slug)}>
              Solicitar una clase sobre este tema
            </a>
            <a className="secondary-action" href="/">Volver al inicio</a>
          </div>
        </div>
        {article.imageUrl ? <img src={article.imageUrl} alt={article.title} loading="lazy" /> : null}
      </div>

      <div className="glossary-article-body">
        <section className="wikipedia-definition">
          <h2>Definición</h2>
          {article.fullDefinition ? <p>{article.fullDefinition}</p> : <p>No se encontró una definición disponible.</p>}
        </section>

        <section className="wikipedia-citation" aria-label="Fuente de la definición">
          <h2>Fuente</h2>
          <p>
            Definición basada en el artículo{" "}
            {wikipediaUrl ? (
              <a href={wikipediaUrl} target="_blank" rel="noreferrer">
                {wikipediaTitle}
              </a>
            ) : (
              <strong>{wikipediaTitle}</strong>
            )}{" "}
            de Wikipedia.
          </p>
        </section>
      </div>
    </article>
  );
}

const institutionTypeOptions = [
  { key: "jardin", label: "Jardín" },
  { key: "primaria", label: "Escuela primaria" },
  { key: "secundaria", label: "Escuela secundaria" },
  { key: "terciario", label: "Instituto terciario" },
  { key: "profesorado", label: "Profesorado" },
  { key: "universidad", label: "Universidad" },
] as const;

type InstitutionTypeKey = (typeof institutionTypeOptions)[number]["key"];

function normalizeSearch(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function bookingTopicTitle(topic: Pick<Topic, "title" | "introduction">) {
  if (topic.introduction?.startsWith("Eje:") && topic.title.includes(": ")) {
    return topic.title.split(": ").slice(1).join(": ");
  }

  return topic.title;
}

function bookingTopicDedupeKey(topic: Pick<Topic, "title" | "introduction">) {
  return normalizeSearch(bookingTopicTitle(topic));
}

function uniqueTypeKeys(typeKeys: InstitutionTypeKey[]) {
  return institutionTypeOptions
    .map((option) => option.key)
    .filter((typeKey) => typeKeys.includes(typeKey));
}

function schoolTypeKeys(school: School): InstitutionTypeKey[] {
  const level = normalizeSearch([school.level, school.generalInfo, school.name].filter(Boolean).join(" "));
  const typeKeys: InstitutionTypeKey[] = [];

  if (level.includes("jardin") || level.includes("inicial") || level.includes("maternal")) typeKeys.push("jardin");
  if (level.includes("primaria") || level.includes("primario")) typeKeys.push("primaria");
  if (level.includes("secundaria") || level.includes("secundario") || level.includes("media")) typeKeys.push("secundaria");
  if (level.includes("profesor")) typeKeys.push("profesorado");
  if (level.includes("univers")) typeKeys.push("universidad");
  if (
    level.includes("snu") ||
    level.includes("superior") ||
    level.includes("terciar") ||
    level.includes("tecnicatura") ||
    level.includes("formacion profesional") ||
    level.includes("inet") ||
    level.includes("instituto")
  ) {
    typeKeys.push("terciario");
  }

  const uniqueKeys = uniqueTypeKeys(typeKeys);

  return uniqueKeys.length ? uniqueKeys : ["secundaria"];
}

function schoolTypeKey(school: School): InstitutionTypeKey {
  return schoolTypeKeys(school)[0];
}

function institutionTypeLabel(typeKeys: InstitutionTypeKey[]) {
  return uniqueTypeKeys(typeKeys).map(typeLabel).join(" · ");
}

function programTypeKey(program: StudyProgram): InstitutionTypeKey {
  const value = normalizeSearch(
    [program.academicLevel, program.name, program.institutionType, program.institutionName].filter(Boolean).join(" "),
  );

  if (value.includes("profesor")) return "profesorado";
  if (value.includes("univers")) return "universidad";

  return "terciario";
}

function typeLabel(typeKey: InstitutionTypeKey) {
  return institutionTypeOptions.find((item) => item.key === typeKey)?.label || "Institución";
}

function parseCoordinate(value: string | null) {
  if (!value || !value.trim()) {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
}

function isRuralInstitution(institution: UnifiedInstitution) {
  return normalizeSearch([institution.name, institution.address, institution.observations].filter(Boolean).join(" "))
    .includes("rural") || normalizeSearch(institution.address).includes("potrero");
}

function buildUnifiedInstitutions(schools: School[], programs: StudyProgram[]) {
  const schoolInstitutions: UnifiedInstitution[] = schools.map((school) => {
    const typeKeys = schoolTypeKeys(school);
    const typeKey = typeKeys[0];

    return {
      id: `school:${school.id}`,
      name: school.name,
      type: [school.level, school.managementType].filter(Boolean).join(" · ") || institutionTypeLabel(typeKeys),
      typeKey,
      typeKeys,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website,
      openingHours: null,
      latitude: school.latitude,
      longitude: school.longitude,
      observations: school.generalInfo,
      sourceName: school.sourceName,
      sourceUrl: school.sourceUrl,
      lastVerifiedAt: school.lastVerifiedAt,
      educationalOffers: [
        {
          id: `school-offer:${school.id}`,
          name: school.level || typeLabel(typeKey),
          type: "Nivel educativo",
          description: school.generalInfo,
        },
      ],
    };
  });

  const groupedPrograms = new Map<string, StudyProgram[]>();
  programs.forEach((program) => {
    groupedPrograms.set(program.institutionId, [...(groupedPrograms.get(program.institutionId) ?? []), program]);
  });

  const programInstitutions = Array.from(groupedPrograms, ([institutionId, institutionPrograms]) => {
    const first = institutionPrograms[0];
    const typeKeys = uniqueTypeKeys(institutionPrograms.map(programTypeKey));
    const typeKey = typeKeys.includes("profesorado") ? "profesorado" : typeKeys[0] ?? programTypeKey(first);

    return {
      id: `institution:${institutionId}`,
      name: first.institutionName,
      type: first.institutionType || institutionTypeLabel(typeKeys),
      typeKey,
      typeKeys,
      address: [first.institutionAddress, first.institutionCity].filter(Boolean).join(", ") || null,
      phone: first.institutionPhone,
      email: first.institutionEmail,
      website: first.institutionWebsite,
      openingHours: null,
      latitude: first.institutionLatitude,
      longitude: first.institutionLongitude,
      observations: first.institutionDescription,
      sourceName: first.sourceName,
      sourceUrl: first.sourceUrl,
      lastVerifiedAt: first.lastVerifiedAt,
      educationalOffers: institutionPrograms.map((program) => ({
        id: program.id,
        name: program.name,
        type: program.academicLevel,
        description: program.description,
        titleGranted: program.titleGranted,
        duration: program.duration,
        modality: program.modality,
        website: program.website || program.sourceUrl,
      })),
    } satisfies UnifiedInstitution;
  });

  return [...schoolInstitutions, ...programInstitutions].sort((a, b) =>
    a.name.localeCompare(b.name, "es-AR", { numeric: true }),
  );
}

function StudySection({
  heading,
  schools,
  isAdmin,
}: {
  heading: ContentBlock | null;
  schools: ReturnType<typeof useApiAllList<School>>;
  isAdmin: boolean;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [offerQuery, setOfferQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<InstitutionTypeKey[]>([]);
  const [ruralOnly, setRuralOnly] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    setState("loading");
    apiGetAll<StudyProgram>("/api/study/programs")
      .then((data) => {
        if (!isMounted) return;
        setPrograms(data);
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const institutions = useMemo(() => buildUnifiedInstitutions(schools.items, programs), [programs, schools.items]);
  const filteredInstitutions = useMemo(() => {
    const nameSearch = normalizeSearch(nameQuery.trim());
    const offerSearch = normalizeSearch(offerQuery.trim());

    return institutions.filter((institution) => {
      const offers = institution.educationalOffers;
      const institutionHaystack = normalizeSearch(
        [institution.name, institution.type, institution.address, institution.phone, institution.email, institution.observations]
          .filter(Boolean)
          .join(" "),
      );
      const offerHaystack = normalizeSearch(
        offers
          .flatMap((offer) => [offer.name, offer.type, offer.description, offer.titleGranted, offer.duration, offer.modality])
          .filter(Boolean)
          .join(" "),
      );

      return (
        (selectedTypes.length === 0 || selectedTypes.some((typeKey) => institution.typeKeys.includes(typeKey))) &&
        (!ruralOnly || isRuralInstitution(institution)) &&
        (!nameSearch || institutionHaystack.includes(nameSearch)) &&
        (!offerSearch || offerHaystack.includes(offerSearch))
      );
    });
  }, [institutions, nameQuery, offerQuery, ruralOnly, selectedTypes]);
  const selectedInstitution =
    filteredInstitutions.find((institution) => institution.id === selectedInstitutionId) ?? filteredInstitutions[0] ?? null;
  const combinedState: LoadState =
    schools.state === "error" || state === "error" ? "error" : schools.state === "loading" || state === "loading" ? "loading" : "ready";

  function toggleType(typeKey: InstitutionTypeKey) {
    setSelectedTypes((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey],
    );
    setSelectedInstitutionId("");
  }

  return (
    <section className="section study-section" id="elegir-que-estudiar">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : <p className="eyebrow">Orientación académica</p>}
        <h2>{heading?.title || "Instituciones y carreras"}</h2>
        <p>
          Buscá jardines, escuelas, institutos, profesorados, universidades y carreras desde un solo lugar.
        </p>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/schools" label="Editar instituciones escolares" />
      </div>

      <div className="unified-study-layout">
        <aside className="institution-filter-panel" aria-label="Filtros de instituciones">
          <h3>Nivel ed.</h3>
          <div className="filter-check-list">
            {institutionTypeOptions.map((option) => (
              <label className="inline-check" key={option.key}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(option.key)}
                  onChange={() => toggleType(option.key)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <label className="inline-check rural-check">
            <span>Rural</span>
            <input
              type="checkbox"
              checked={ruralOnly}
              onChange={(event) => {
                setRuralOnly(event.target.checked);
                setSelectedInstitutionId("");
              }}
            />
          </label>

          <label>
            Nombre o número
            <input
              value={nameQuery}
              onChange={(event) => {
                setNameQuery(event.target.value);
                setSelectedInstitutionId("");
              }}
              placeholder="Ej. 44, Clavarino"
            />
          </label>

          <label>
            Tiene oferta o materia
            <input
              value={offerQuery}
              onChange={(event) => {
                setOfferQuery(event.target.value);
                setSelectedInstitutionId("");
              }}
              placeholder="Ej. primaria, matemática"
            />
          </label>

          {(selectedTypes.length || ruralOnly || nameQuery || offerQuery) ? (
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setNameQuery("");
                setOfferQuery("");
                setSelectedTypes([]);
                setRuralOnly(false);
                setSelectedInstitutionId("");
              }}
            >
              Limpiar filtros
            </button>
          ) : null}
        </aside>

        <section className="institution-results-panel" aria-label="Resultados de instituciones">
          <div className="study-results-header">
            <h3>Resultados</h3>
            <span>{filteredInstitutions.length}</span>
          </div>
          <div className="institution-result-list" role="listbox" aria-label="Instituciones encontradas">
          {filteredInstitutions.map((institution) => (
            <button
              className={selectedInstitution?.id === institution.id ? "selected" : ""}
              key={institution.id}
              type="button"
              onClick={() => setSelectedInstitutionId(institution.id)}
            >
              <strong>{institution.name}</strong>
              <span>{institution.type}</span>
              <small>{institution.educationalOffers.map((offer) => offer.name).slice(0, 3).join(" · ")}</small>
            </button>
          ))}
          {filteredInstitutions.length === 0 ? <p className="muted">No hay coincidencias con esos filtros.</p> : null}
          </div>
        </section>

        <section className="institution-map-column" aria-label="Localización en mapa">
          <h3>Localización en mapa</h3>
          {selectedInstitution ? (
            <LeafletInstitutionMap institution={selectedInstitution} />
          ) : (
            <p className="muted">Seleccioná una institución para ver su localización.</p>
          )}
        </section>

        {selectedInstitution ? (
          <article className="info-card institution-detail-card institution-full-detail">
            <div className="institution-detail-main">
              <div>
                <span className="tag">{selectedInstitution.type}</span>
                <h3>{selectedInstitution.name}</h3>
                {selectedInstitution.observations ? <p>{selectedInstitution.observations}</p> : null}
              </div>
              <dl>
                <dt>Dirección</dt>
                <dd>{selectedInstitution.address || "No informada"}</dd>
                <dt>Teléfono</dt>
                <dd>{selectedInstitution.phone || "No informado"}</dd>
                <dt>Correo</dt>
                <dd>{selectedInstitution.email || "No informado"}</dd>
                <dt>Sitio web o redes</dt>
                <dd>
                  {selectedInstitution.website ? (
                    <a className="text-action" href={selectedInstitution.website} target="_blank" rel="noreferrer">
                      Abrir sitio
                    </a>
                  ) : (
                    "No informado"
                  )}
                </dd>
                <dt>Horarios de atención</dt>
                <dd>{selectedInstitution.openingHours || "No informados"}</dd>
              </dl>
            </div>

            <section>
              <h4>Ofertas educativas</h4>
              <div className="study-topic-list">
                {selectedInstitution.educationalOffers.map((offer) => (
                  <span key={offer.id}>{offer.name}</span>
                ))}
              </div>
              {selectedInstitution.educationalOffers.map((offer) => (
                <div className="offer-detail" key={offer.id}>
                  <strong>{offer.name}</strong>
                  <small>{[offer.type, offer.titleGranted, offer.duration, offer.modality].filter(Boolean).join(" · ")}</small>
                  {offer.description ? <p>{offer.description}</p> : null}
                  {offer.website ? <a className="text-action" href={offer.website} target="_blank" rel="noreferrer">Ver oferta</a> : null}
                </div>
              ))}
            </section>

            {selectedInstitution.sourceName ? (
              <p className="source-note">
                Fuente: {selectedInstitution.sourceName}
                {selectedInstitution.lastVerifiedAt ? ` · verificado ${selectedInstitution.lastVerifiedAt}` : ""}
                {selectedInstitution.sourceUrl ? (
                  <>
                    {" · "}
                    <a href={selectedInstitution.sourceUrl} target="_blank" rel="noreferrer">Ver fuente</a>
                  </>
                ) : null}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
      <SectionState
        state={combinedState}
        emptyText={institutions.length === 0 ? "Todavía no hay instituciones cargadas." : undefined}
      />
    </section>
  );
}

function AuthModal({
  currentUser,
  onAuth,
  onClose,
  onLogout,
}: {
  currentUser: AuthUser | null;
  onAuth: (user: AuthUser) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "register" && password.length < 8) {
        setMessage("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password,
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          dni: String(form.get("dni") ?? ""),
          phone: String(form.get("phone") ?? ""),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "AUTH_ERROR");
      }

      onAuth(data.user);
      onClose();

      if (data.user.role !== "USER") {
        window.location.hash = "#/admin";
      }
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS"
          ? "Ya existe un usuario con ese correo electrónico. Inicia sesión."
          : "No pudimos validar el acceso. Revisa el correo electrónico y la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <section className="login-card auth-modal">
        <div className="modal-header">
          <a className="brand" href="#inicio">AulaCiencias</a>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar">
             <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="20" y1="4" x2="4" y2="20"></line>
              <line x1="4" y1="4" x2="20" y2="20"></line>
             </svg>
          </button>
        </div>
        <p className="eyebrow">{mode === "login" ? "Acceso" : "Crear usuario"}</p>
        <h1 id="auth-modal-title">{mode === "login" ? "Ingresar" : "Registrarse"}</h1>
        {currentUser ? (
          <div className="session-box">
            <p>Sesion iniciada como <strong>{currentUser.email}</strong>.</p>
            <div className="hero-actions">
              <a className="primary-action" href={currentUser.role === "USER" ? "#silvi" : "#/admin"}>
                Continuar
              </a>
              <button className="secondary-action" type="button" onClick={onLogout}>Salir</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === "register" ? (
              <div className="form-grid">
                <label>Nombre<input name="firstName" required /></label>
                <label>Apellido<input name="lastName" required /></label>
                <label>DNI<input name="dni" required /></label>
                <label>Teléfono<input name="phone" /></label>
              </div>
            ) : null}
            <label>Correo electrónico<input name="email" type="email" required /></label>
            <label>Contraseña<input name="password" type="password" minLength={mode === "register" ? 8 : 1} required /></label>
            <button className="primary-action button-action" type="submit" disabled={loading}>
              {loading ? "Validando..." : mode === "login" ? "Ingresar" : "Crear usuario"}
            </button>
          </form>
        )}
        {message ? <p className="error-text">{message}</p> : null}
        {!currentUser ? (
          <button className="text-action button-link" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Crear usuario común" : "Ya tengo usuario"}
          </button>
        ) : null}
        {currentUser && currentUser.role !== "USER" ? (
          <a className="text-action" href="#/admin">Ingresar como administrador</a>
        ) : null}
      </section>
    </div>
  );
}

function DownloadablesSection({
  categories,
  category,
  setCategory,
  recent,
  downloadables,
  isAdmin,
  heading,
}: {
  categories: { slug: string; name: string }[];
  category: string;
  setCategory: (value: string) => void;
  recent: ReturnType<typeof useApiList<Downloadable>>;
  downloadables: ReturnType<typeof useApiList<Downloadable>>;
  isAdmin: boolean;
  heading: ContentBlock | null;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const carouselDeckRef = useRef<Downloadable[]>([]);
  const carouselPoolRef = useRef<Downloadable[]>([]);
  const carouselCardCounterRef = useRef(0);
  const carouselInteractionTimeoutRef = useRef<number | null>(null);
  const carouselAutoScrollRemainderRef = useRef(0);
  const isCarouselInteractingRef = useRef(false);
  const [carouselQueue, setCarouselQueue] = useState<DownloadableCarouselCard[]>([]);
  const carouselSource = category ? downloadables.items : recent.items;
  const carouselSourceSignature = carouselSource.map((item) => item.id).join("|");
  const carouselState = category ? downloadables.state : recent.state;

  function makeCarouselCard(item: Downloadable): DownloadableCarouselCard {
    carouselCardCounterRef.current += 1;

    return {
      instanceId: `${item.id}-${carouselCardCounterRef.current}`,
      item,
    };
  }

  function drawCarouselItem(excludedIds = new Set<string>()) {
    const pool = carouselPoolRef.current;

    if (pool.length === 0) {
      return null;
    }

    if (carouselDeckRef.current.length === 0) {
      carouselDeckRef.current = shuffleItems(pool);
    }

    const deckIndex = carouselDeckRef.current.findIndex((item) => !excludedIds.has(item.id));

    if (deckIndex >= 0) {
      const [item] = carouselDeckRef.current.splice(deckIndex, 1);
      return item;
    }

    return pool.find((item) => !excludedIds.has(item.id)) ?? pool[Math.floor(Math.random() * pool.length)];
  }

  function carouselCardStep() {
    const carousel = carouselRef.current;
    const firstCard = carousel?.querySelector<HTMLElement>(".carousel-card");

    if (!carousel || !firstCard) {
      return 0;
    }

    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap || "0") || 0;
    return firstCard.getBoundingClientRect().width + gap;
  }

  function cycleCarouselForward(steps = 1) {
    setCarouselQueue((current) => {
      let next = current;

      for (let index = 0; index < steps; index += 1) {
        if (next.length <= 1) {
          return next;
        }

        const recentIds = new Set(next.slice(-Math.min(4, next.length)).map((card) => card.item.id));
        const item = drawCarouselItem(recentIds) ?? next[0].item;
        next = [...next.slice(1), makeCarouselCard(item)];
      }

      return next;
    });
  }

  function cycleCarouselBackward() {
    const step = carouselCardStep();

    if (step <= 0) {
      return;
    }

    setCarouselQueue((current) => {
      if (current.length <= 1) {
        return current;
      }

      const firstIds = new Set(current.slice(0, Math.min(4, current.length)).map((card) => card.item.id));
      const item = drawCarouselItem(firstIds) ?? current[current.length - 1].item;
      return [makeCarouselCard(item), ...current.slice(0, -1)];
    });

    window.requestAnimationFrame(() => {
      const carousel = carouselRef.current;

      if (carousel) {
        carousel.scrollLeft += step;
      }
    });
  }

  function normalizeCarouselPosition() {
    const carousel = carouselRef.current;
    const step = carouselCardStep();

    if (!carousel || step <= 0) {
      return;
    }

    let cycles = 0;

    while (carousel.scrollLeft >= step && cycles < 4) {
      carousel.scrollLeft -= step;
      cycles += 1;
    }

    if (cycles > 0) {
      cycleCarouselForward(cycles);
    }
  }

  function pauseCarouselBriefly(durationMs = 1400) {
    isCarouselInteractingRef.current = true;

    if (carouselInteractionTimeoutRef.current) {
      window.clearTimeout(carouselInteractionTimeoutRef.current);
    }

    carouselInteractionTimeoutRef.current = window.setTimeout(() => {
      isCarouselInteractingRef.current = false;
      carouselInteractionTimeoutRef.current = null;
    }, durationMs);
  }

  function scrollCarousel(direction: -1 | 1) {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    pauseCarouselBriefly();

    if (direction < 0 && carousel.scrollLeft < 8) {
      cycleCarouselBackward();
    }

    carousel.scrollBy({ left: direction * Math.max(320, carousel.clientWidth * 0.72), behavior: "smooth" });
    window.setTimeout(normalizeCarouselPosition, 420);
  }

  function handleCarouselWheel(event: WheelEvent<HTMLDivElement>) {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    if (delta === 0) {
      return;
    }

    event.preventDefault();
    pauseCarouselBriefly(900);

    if (delta < 0 && carousel.scrollLeft < 8) {
      cycleCarouselBackward();
    }

    carousel.scrollLeft += delta * 1.7;
    normalizeCarouselPosition();
  }

  useEffect(() => {
    if (carouselSource.length === 0) {
      if ((category && downloadables.state === "ready") || (!category && recent.state === "ready")) {
        setCarouselQueue([]);
      }

      return;
    }

    carouselPoolRef.current = carouselSource;
    carouselDeckRef.current = shuffleItems(carouselSource);

    const initialLength = Math.max(12, Math.min(24, carouselSource.length * 3));
    const nextQueue = Array.from({ length: initialLength }, () => {
      const item = drawCarouselItem() ?? carouselSource[0];
      return makeCarouselCard(item);
    });

    setCarouselQueue(nextQueue);

    window.requestAnimationFrame(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft = 0;
      }
      carouselAutoScrollRemainderRef.current = 0;
    });
  }, [carouselSourceSignature, category, downloadables.state, recent.state]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();

    function animate(currentTime: number) {
      const carousel = carouselRef.current;
      const elapsed = Math.min(64, currentTime - previousTime);
      previousTime = currentTime;

      if (
        carousel &&
        carouselQueue.length > 1 &&
        !isCarouselInteractingRef.current &&
        document.visibilityState !== "hidden"
      ) {
        const autoScrollDelta = carouselAutoScrollRemainderRef.current + (64 * elapsed) / 1000;
        const wholePixels = Math.trunc(autoScrollDelta);
        carouselAutoScrollRemainderRef.current = autoScrollDelta - wholePixels;

        if (wholePixels > 0) {
          carousel.scrollLeft += wholePixels;
        }

        normalizeCarouselPosition();
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [carouselQueue.length]);

  useEffect(
    () => () => {
      if (carouselInteractionTimeoutRef.current) {
        window.clearTimeout(carouselInteractionTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <section className="section" id="descargables">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : null}
        <h2>{heading?.title || ""}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/downloadables" label="Editar descargables y categorías" />
      </div>

      <div className="downloadable-toolbar">
        <label>
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="downloadable-carousel-shell">
        <button className="carousel-arrow carousel-arrow-left" type="button" onClick={() => scrollCarousel(-1)} aria-label="Ver materiales anteriores">
          ‹
        </button>
        <div
          className="carousel"
          aria-label="Fotos recientes"
          onWheel={handleCarouselWheel}
          ref={carouselRef}
          tabIndex={0}
        >
          {carouselQueue.map(({ instanceId, item }) => (
            <a className="carousel-card" href={downloadableHref(item)} key={instanceId}>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.title} draggable={false} /> : <div className="image-fallback" />}
              <div>
                <strong>{item.title}</strong>
                <span>{item.categoryName}</span>
              </div>
            </a>
          ))}
        </div>
        <button className="carousel-arrow carousel-arrow-right" type="button" onClick={() => scrollCarousel(1)} aria-label="Ver materiales siguientes">
          ›
        </button>
      </div>
      <SectionState
        state={carouselState}
        emptyText={carouselSource.length === 0 ? "No hay contenido para este filtro." : undefined}
      />
    </section>
  );
}

function DownloadableDetailPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<DownloadableDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    setState("loading");
    apiGet<DownloadableDetail>(`/api/downloadables/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!isMounted) return;
        setDetail(data);
        document.title = `${data.item.title} - Material AulaCiencias`;
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <section className="section">
        <p className="muted">Cargando material...</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="section">
        <h1>Material no encontrado</h1>
        <p className="muted">No encontramos ese contenido descargable.</p>
        <a className="secondary-action" href="/#descargables">Volver a materiales</a>
      </section>
    );
  }

  const { item, related } = detail;

  return (
    <article className="section downloadable-detail-page">
      <div className="downloadable-detail-hero">
        <div>
          <p className="eyebrow">{item.categoryName}</p>
          <h1>{item.title}</h1>
          {item.description ? <p>{item.description}</p> : null}
          <div className="definition-actions">
            <a className="primary-action" href={bookingRequestHref(item.title)}>
              Tomar una clase sobre este tema con Silvi
            </a>
            {item.imageUrl ? (
              <a className="secondary-action" href={item.imageUrl} download target="_blank" rel="noreferrer">
                Descargar imagen
              </a>
            ) : null}
            <a className="secondary-action" href="/#descargables">Ver otros materiales</a>
          </div>
        </div>
        {item.imageUrl ? (
          <a className="downloadable-detail-image-link" href={item.imageUrl} target="_blank" rel="noreferrer">
            <img src={item.imageUrl} alt={item.title} />
          </a>
        ) : (
          <div className="image-fallback" />
        )}
      </div>

      <section className="downloadable-related-section" aria-label="Materiales relacionados">
        <div className="section-heading">
          <p className="eyebrow">Relacionados</p>
          <h2>Materiales relacionados</h2>
        </div>
        <div className="gallery-grid">
          {related.map((relatedItem) => (
            <article className="resource-card" key={relatedItem.id}>
              <a className="resource-image-link" href={downloadableHref(relatedItem)}>
                {relatedItem.imageUrl ? (
                  <img src={relatedItem.imageUrl} alt={relatedItem.title} />
                ) : (
                  <div className="image-fallback" />
                )}
              </a>
              <div className="card-body">
                <span className="tag">{relatedItem.categoryName}</span>
                <h3>
                  <a href={downloadableHref(relatedItem)}>{relatedItem.title}</a>
                </h3>
                {relatedItem.description ? <p>{relatedItem.description}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="downloadable-class-invite">
        <div>
          <p className="eyebrow">Clase particular</p>
          <h2>Practicar este tema con acompañamiento</h2>
          <p>
            Si este material te sirve como punto de partida, podés pedir una clase para repasarlo, resolver ejercicios y
            preparar dudas puntuales.
          </p>
        </div>
        <a className="primary-action" href={bookingRequestHref(item.title)}>
          Reservar con Silvi
        </a>
      </section>
    </article>
  );
}

function TopicsSection({ heading, topics }: { heading: ContentBlock | null; topics: ReturnType<typeof useApiList<Topic>> }) {
  return (
    <section className="section alt-section" id="temarios">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : null}
        <h2>{heading?.title || ""}</h2>
      </div>
      <div className="topic-grid">
        {topics.items.map((topic) => (
          <article className="info-card" key={topic.id}>
            <span className="tag">{topic.subject || "Ciencias"}</span>
            <h3>{topic.title}</h3>
            <p className="topic-meta">
              {[topic.educationLevel, topic.educationTrack, topic.schoolYear].filter(Boolean).join(" · ")}
            </p>
            {topic.introduction ? <p>{topic.introduction}</p> : null}
            {topic.importance ? (
              <p>
                <strong>Importancia:</strong> {topic.importance}
              </p>
            ) : null}
            {topic.relatedCareers ? (
              <p>
                <strong>Profesiones relacionadas:</strong> {topic.relatedCareers}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <SectionState
        state={topics.state}
        emptyText={topics.items.length === 0 ? "Todavia no hay temarios publicados." : undefined}
      />
    </section>
  );
}

const gualeguaychuCenter: [number, number] = [-33.0094, -58.5172];

function LeafletInstitutionMap({ institution }: { institution: UnifiedInstitution }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocodeState, setGeocodeState] = useState<LoadState>("idle");
  const latitude = parseCoordinate(institution.latitude);
  const longitude = parseCoordinate(institution.longitude);
  const hasCoordinates = latitude !== null && longitude !== null;
  const hasSpecificAddress = Boolean(
    institution.address &&
      !/^gualeguaychu,\s*entre rios$/i.test(institution.address.trim()) &&
      !/^gualeguaychu,\s*entre r[ií]os$/i.test(institution.address.trim()),
  );
  const fallbackQuery = [institution.address, "Gualeguaychu Entre Rios Argentina"].filter(Boolean).join(", ");
  const selectedPosition: [number, number] | null = hasCoordinates
    ? [latitude, longitude]
    : resolvedCoordinates
      ? [resolvedCoordinates.latitude, resolvedCoordinates.longitude]
      : null;
  const mapCenter = selectedPosition ?? gualeguaychuCenter;

  useEffect(() => {
    setResolvedCoordinates(null);

    if (hasCoordinates) {
      setGeocodeState("ready");
      return;
    }

    if (!hasSpecificAddress) {
      setGeocodeState("ready");
      return;
    }

    let isMounted = true;
    setGeocodeState("loading");

    apiGet<{ item: { latitude: string; longitude: string; label: string } | null }>(
      `/api/map/geocode?q=${encodeURIComponent(fallbackQuery)}`,
    )
      .then((data) => {
        if (!isMounted) return;
        const nextLatitude = parseCoordinate(data.item?.latitude ?? null);
        const nextLongitude = parseCoordinate(data.item?.longitude ?? null);

        if (nextLatitude !== null && nextLongitude !== null) {
          setResolvedCoordinates({ latitude: nextLatitude, longitude: nextLongitude });
        }

        setGeocodeState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setGeocodeState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackQuery, hasCoordinates, hasSpecificAddress, institution.id]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: selectedPosition ? 15 : 13,
      scrollWheelZoom: false,
    });

    L.tileLayer("/api/map/tiles/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
      minZoom: 3,
      tileSize: 256,
    }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.invalidateSize();
    map.setView(mapCenter, selectedPosition ? 15 : 13, { animate: true });

    if (!selectedPosition) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const icon = L.divIcon({
      className: "school-map-marker",
      html: "",
      iconAnchor: [9, 9],
      iconSize: [18, 18],
    });

    if (!markerRef.current) {
      markerRef.current = L.marker(selectedPosition, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(selectedPosition);
    }

    markerRef.current.bindPopup(institution.name);
  }, [institution.name, mapCenter[0], mapCenter[1], selectedPosition?.[0], selectedPosition?.[1]]);

  return (
    <div className="leaflet-school-map-wrap">
      <div className="leaflet-school-map" ref={containerRef} aria-label={`Mapa de ${institution.name}`} />
      {!hasCoordinates && geocodeState === "loading" ? (
        <p className="source-note">Buscando ubicación por dirección...</p>
      ) : null}
      {!hasCoordinates && geocodeState === "ready" ? (
        <p className="source-note">
          {resolvedCoordinates
            ? "Ubicación estimada por dirección. Para mayor precisión, cargá coordenadas en administración."
            : "Esta institución no tiene coordenadas ni dirección específica; se muestra Gualeguaychú sin marcador."}
        </p>
      ) : null}
      {!hasCoordinates && geocodeState === "error" ? (
        <p className="source-note">No pudimos resolver la dirección; se muestra Gualeguaychú sin marcador.</p>
      ) : null}
    </div>
  );
}

function BookingSection({
  heading,
  timeSlots,
  topics,
  topicsState,
  subjects,
  subjectsState,
  bookingFilterOptions,
  bookingFilterOptionsState,
  settings,
  currentUser,
  isAdmin,
}: {
  heading: ContentBlock | null;
  timeSlots: ReturnType<typeof useApiList<BookingTimeSlot>>;
  topics: Topic[];
  topicsState: LoadState;
  subjects: Subject[];
  subjectsState: LoadState;
  bookingFilterOptions: BookingFilterOption[];
  bookingFilterOptionsState: LoadState;
  settings: PublicSettings;
  currentUser: AuthUser | null;
  isAdmin: boolean;
}) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue(new Date()));
  const [startTime, setStartTime] = useState("");
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<BookingObjectiveId[]>([]);
  const [modalidad, setModalidad] = useState<BookingModality | "">("");
  const [tipoClase, setTipoClase] = useState<BookingClassType | "">("");
  const [showPackPromotions, setShowPackPromotions] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [topicQuery, setTopicQuery] = useState("");
  const [customTopics, setCustomTopics] = useState<CustomBookingTopic[]>([]);
  const [specificTopicNotes, setSpecificTopicNotes] = useState("");
  const [student, setStudent] = useState<StudentForm>(initialStudentForm);
  const [availabilities, setAvailabilities] = useState<Record<string, {
    available: boolean;
    booked: number;
    capacity: number;
    endTime?: string;
    reason?: string;
    expiresAt?: string | null;
  }>>({});
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [availabilityState, setAvailabilityState] = useState<LoadState>("idle");
  const [submitState, setSubmitState] = useState<LoadState>("idle");
  const [bookingMessage, setBookingMessage] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setAvailabilities((current) => {
      let changed = false;
      const next = Object.fromEntries(Object.entries(current).map(([date, availability]) => {
        const expired = availability.reason === "RESERVATION_PENDING"
          && availability.expiresAt
          && new Date(availability.expiresAt).getTime() <= countdownNow;
        if (!expired) return [date, availability];
        changed = true;
        return [date, { ...availability, available: true, booked: Math.max(0, availability.booked - 1), reason: undefined, expiresAt: null }];
      }));
      return changed ? next : current;
    });
  }, [countdownNow]);

  function pendingTimeLeft(expiresAt?: string | null) {
    if (!expiresAt) return "";
    const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - countdownNow) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
  const bookingLevels = useMemo(
    () => bookingFilterOptions.filter((option) => option.kind === "level"),
    [bookingFilterOptions],
  );
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) ?? null;
  const activeSubjectName = selectedSubject?.name ?? null;
  const activeSubjectId = selectedSubject?.id ?? null;
  const selectedLevel = bookingFilterOptions.find((option) => option.id === selectedLevelId) ?? null;
  const selectedYear = bookingFilterOptions.find((option) => option.id === selectedYearId) ?? null;
  const selectedTrack = bookingFilterOptions.find((option) => option.id === selectedTrackId) ?? null;
  const canListCatalogTopics = !selectedLevel || selectedLevel.label === "Primaria" || selectedLevel.label === "Secundaria";
  const topicYears = useMemo(
    () =>
      bookingFilterOptions.filter(
        (option) => option.kind === "year" && Boolean(selectedLevelId) && option.parentId === selectedLevelId,
      ),
    [bookingFilterOptions, selectedLevelId],
  );
  const topicTracks = useMemo(() => {
    const parentIds = new Set<string>();

    if (selectedLevelId) {
      parentIds.add(selectedLevelId);
    }

    if (selectedYearId) {
      parentIds.add(selectedYearId);
    }

    return bookingFilterOptions.filter(
      (option) => option.kind === "track" && parentIds.size > 0 && Boolean(option.parentId && parentIds.has(option.parentId)),
    );
  }, [bookingFilterOptions, selectedLevelId, selectedYearId]);
  const promotionalPacks = useMemo<PackPromocional[]>(
    () =>
      promotionalPackTemplates.map((pack) => ({
        ...pack,
        horariosDisponibles: timeSlots.items.map((slot) => ({
          id: slot.id,
          startTime: slot.startTime,
          label: slot.label,
        })),
      })),
    [timeSlots.items],
  );
  const selectedPack = promotionalPacks.find((pack) => pack.id === selectedPackId) ?? null;
  const filteredTopics = useMemo(
    () => {
      const query = normalizeSearch(topicQuery.trim());
      const selectedSubjectName = normalizeSearch(activeSubjectName);
      const selectedLevelLabel = normalizeSearch(selectedLevel?.label);
      const selectedYearLabel = normalizeSearch(selectedYear?.label);
      const selectedTrackLabel = normalizeSearch(selectedTrack?.label);

      if (!canListCatalogTopics) {
        return [];
      }

      const matchedTopics = topics.filter((topic) => {
        const haystack = normalizeSearch(
          [bookingTopicTitle(topic), topic.title, topic.subject, topic.educationLevel, topic.educationTrack, topic.schoolYear, topic.introduction]
            .filter(Boolean)
            .join(" "),
        );

        return (
          (!selectedSubjectName || normalizeSearch(topic.subject) === selectedSubjectName) &&
          (!selectedLevelLabel || normalizeSearch(topic.educationLevel) === selectedLevelLabel) &&
          (!selectedYearLabel || normalizeSearch(topic.schoolYear) === selectedYearLabel) &&
          (!selectedTrackLabel || normalizeSearch(topic.educationTrack) === selectedTrackLabel) &&
          (!query || haystack.includes(query))
        );
      });

      const uniqueTopics = new Map<string, Topic>();

      matchedTopics.forEach((topic) => {
        const key = bookingTopicDedupeKey(topic);
        const existingTopic = uniqueTopics.get(key);

        if (!existingTopic || selectedTopicIds.includes(topic.id)) {
          uniqueTopics.set(key, topic);
        }
      });

      return Array.from(uniqueTopics.values()).sort((left, right) =>
        bookingTopicTitle(left).localeCompare(bookingTopicTitle(right), "es-AR", { numeric: true }),
      );
    },
    [activeSubjectName, canListCatalogTopics, selectedLevel, selectedTrack, selectedTopicIds, selectedYear, topicQuery, topics],
  );
  const normalizedTopicQuery = normalizeSearch(topicQuery.trim());
  const selectedLevelNeedsYear = selectedLevel?.label === "Primaria" || selectedLevel?.label === "Secundaria";
  const hasCustomTopicContext = Boolean(activeSubjectName && selectedLevel && (!selectedLevelNeedsYear || selectedYear));
  const hasExactTopicMatch =
    Boolean(normalizedTopicQuery) &&
    filteredTopics.some((topic) => normalizeSearch(bookingTopicTitle(topic)) === normalizedTopicQuery);
  const hasExactCustomTopicMatch =
    Boolean(normalizedTopicQuery) &&
    customTopics.some(
      (topic) =>
        normalizeSearch(topic.title) === normalizedTopicQuery &&
        normalizeSearch(topic.subject) === normalizeSearch(activeSubjectName) &&
        normalizeSearch(topic.educationLevel) === normalizeSearch(selectedLevel?.label) &&
        normalizeSearch(topic.schoolYear) === normalizeSearch(selectedYear?.label) &&
        normalizeSearch(topic.educationTrack) === normalizeSearch(selectedTrack?.label),
    );
  const canAddCustomTopic =
    topicQuery.trim().length > 1 && hasCustomTopicContext && !hasExactTopicMatch && !hasExactCustomTopicMatch;

  useEffect(() => {
    if (selectedYearId && !topicYears.some((option) => option.id === selectedYearId)) {
      setSelectedYearId("");
    }
  }, [selectedYearId, topicYears]);

  useEffect(() => {
    if (selectedTrackId && !topicTracks.some((option) => option.id === selectedTrackId)) {
      setSelectedTrackId("");
    }
  }, [selectedTrackId, topicTracks]);

  useEffect(() => {
    const visibleTopicIds = new Set(filteredTopics.map((topic) => topic.id));
    setSelectedTopicIds((current) => {
      const next = current.filter((id) => visibleTopicIds.has(id));

      return next.length === current.length && next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [filteredTopics]);

  useEffect(() => {
    if (!showPackPromotions) {
      setSelectedPackId("");
    }
  }, [showPackPromotions]);

  useEffect(() => {
    if (!selectedPack) {
      return;
    }

    if (
      (modalidad && !selectedPack.modalidadDisponible.includes(modalidad)) ||
      (tipoClase && !selectedPack.tipoClaseDisponible.includes(tipoClase))
    ) {
      setSelectedPackId("");
      setStartTime("");
    }
  }, [modalidad, selectedPack, tipoClase]);

  useEffect(() => {
    const requestedTopic = new URLSearchParams(window.location.search).get("solicitar");

    if (!requestedTopic || topics.length === 0) {
      return;
    }

    const requestedKey = slugify(requestedTopic);
    const matchingSubject = subjects.find((subject) => subject.slug === requestedKey || slugify(subject.name) === requestedKey);

    if (matchingSubject) {
      setSelectedSubjectId(matchingSubject.id);
      setSelectedTopicIds([]);
      setTopicQuery("");
      return;
    }

    const matchingTopic = topics.find((topic) => slugify(bookingTopicTitle(topic)) === requestedKey) ?? topics.find((topic) =>
      [bookingTopicTitle(topic), topic.title, topic.subject].some((value) => value && slugify(value).includes(requestedKey)),
    );

    if (!matchingTopic) {
      setTopicQuery(requestedTopic);
      return;
    }

    const topicSubject = subjects.find((subject) => subject.name === matchingTopic.subject);
    const levelOption = bookingFilterOptions.find(
      (option) => option.kind === "level" && option.label === matchingTopic.educationLevel,
    );
    const yearOption = levelOption
      ? bookingFilterOptions.find(
          (option) => option.kind === "year" && option.parentId === levelOption.id && option.label === matchingTopic.schoolYear,
        )
      : null;
    const trackParentIds = new Set([levelOption?.id, yearOption?.id].filter(Boolean));
    const trackOption = matchingTopic.educationTrack
      ? bookingFilterOptions.find(
          (option) =>
            option.kind === "track" &&
            option.label === matchingTopic.educationTrack &&
            Boolean(option.parentId && trackParentIds.has(option.parentId)),
        )
      : null;

    setSelectedSubjectId(topicSubject?.id ?? "");
    setSelectedLevelId(levelOption?.id ?? "");
    setSelectedYearId(yearOption?.id ?? "");
    setSelectedTrackId(trackOption?.id ?? "");
    setTopicQuery(bookingTopicTitle(matchingTopic));
    setSelectedTopicIds((current) => (current.includes(matchingTopic.id) ? current : [matchingTopic.id]));
  }, [bookingFilterOptions, subjects, topics]);

  const totalSelectedTopicCount = selectedTopicIds.length + customTopics.length;
  const hours = calculateBookingHours(totalSelectedTopicCount, settings.topicsPerHour);
  const endTime = startTime ? addHours(startTime, hours) : "";
  const selectedSchedules: SelectedBookingSchedule[] =
    startTime && endTime
      ? selectedDates.map((selectedDate) => ({
          selectedDate,
          startTime,
          endTime,
          packId: showPackPromotions ? selectedPackId || null : null,
        }))
      : [];
  const hasRequiredBookingPreferences = selectedObjectiveIds.length > 0 && Boolean(modalidad) && Boolean(tipoClase);
  const hasRequiredPackSelection = !showPackPromotions || Boolean(selectedPackId && selectedSchedules.length > 0);
  const estimatedAmount = hours * Number(settings.pricePerHour || 0);
  const monthOptions = useMemo(() => buildMonthOptions(8), []);
  const dateOptions = useMemo(() => buildDateOptionsForMonth(selectedMonth), [selectedMonth]);
  const canCheckAvailability = selectedDates.length > 0 && startTime && totalSelectedTopicCount > 0;
  const selectedAvailability = selectedDates.map((date) => availabilities[date]).filter(Boolean);
  const allSelectedDatesAvailable =
    selectedDates.length > 0 &&
    selectedAvailability.length === selectedDates.length &&
    selectedAvailability.every((item) => item.available);

  useEffect(() => {
    if (!canCheckAvailability) {
      setAvailabilities({});
      setAvailabilityState("idle");
      return;
    }

    let isMounted = true;
    setAvailabilityState("loading");

    Promise.all(
      selectedDates.map((date) => {
        const params = new URLSearchParams({
          date,
          startTime,
          endTime,
          topicIds: selectedTopicIds.join(","),
        });

        return apiGet<{
          available: boolean;
          booked: number;
          capacity: number;
          endTime: string;
          reason?: string;
          expiresAt?: string | null;
        }>(`/api/availability?${params.toString()}`).then((data) => [date, data] as const);
      }),
    )
      .then((entries) => {
        if (!isMounted) return;
        setAvailabilities(Object.fromEntries(entries));
        setAvailabilityState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setAvailabilityState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [canCheckAvailability, endTime, selectedDates, selectedTopicIds, startTime]);

  function toggleTopic(id: string) {
    setSelectedTopicIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleObjective(id: BookingObjectiveId) {
    setSelectedObjectiveIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function addCustomTopic() {
    const title = topicQuery.trim();

    if (!canAddCustomTopic) {
      return;
    }

    setCustomTopics((current) => [
      ...current,
      {
        clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        subjectId: activeSubjectId,
        subject: activeSubjectName,
        educationLevel: selectedLevel?.label ?? null,
        schoolYear: selectedYear?.label ?? null,
        educationTrack: selectedTrack?.label ?? null,
      },
    ]);
    setTopicQuery("");
  }

  function removeCustomTopic(clientId: string) {
    setCustomTopics((current) => current.filter((topic) => topic.clientId !== clientId));
  }

  function toggleDate(date: string) {
    setSelectedDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort(),
    );
  }

  function updateStudent(field: keyof StudentForm, value: string) {
    setStudent((current) => ({ ...current, [field]: value }));
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingMessage("");

    if (!hasRequiredBookingPreferences || !startTime || !hasRequiredPackSelection) {
      setBookingMessage("Seleccioná objetivos, modalidad, tipo de clase y un horario válido antes de confirmar.");
      setSubmitState("error");
      return;
    }

    setSubmitState("loading");

    try {
      const response = await fetch("/api/bookings/bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedDates,
          startTime,
          topicIds: selectedTopicIds,
          customTopics: customTopics.map(({ clientId: _clientId, ...topic }) => topic),
          objetivos: selectedObjectiveIds,
          modalidad,
          tipoClase,
          usaPackPromocional: showPackPromotions,
          packSeleccionado: showPackPromotions ? selectedPackId : null,
          horariosSeleccionados: selectedSchedules,
          adminNotes: specificTopicNotes.trim() || null,
          student,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "BOOKING_ERROR");
      }

      const objectiveLabels = selectedObjectiveIds
        .map((id) => bookingObjectiveOptions.find((option) => option.id === id)?.label)
        .filter(Boolean)
        .join(", ");
      const messageLines = [
        "Hola Silvi, acabo de solicitar una clase. La reserva queda pendiente durante 15 minutos.",
        "",
        `Alumno/a: ${student.firstName} ${student.lastName}`,
        `Materia: ${activeSubjectName || selectedTopics.map((topic) => topic.subject).filter(Boolean).join(", ") || "A confirmar"}`,
        `Nivel: ${selectedLevel?.label || "A confirmar"}`,
        `Año: ${selectedYear?.label || "A confirmar"}`,
        selectedTrack?.label ? `Tipo/orientación: ${selectedTrack.label}` : "",
        `Temas: ${[...selectedTopics.map(bookingTopicTitle), ...customTopics.map((topic) => topic.title)].join(", ")}`,
        specificTopicNotes.trim() ? `Detalle para reforzar: ${specificTopicNotes.trim()}` : "",
        `Objetivo: ${objectiveLabels}`,
        `Modalidad: ${bookingModalityOptions.find((option) => option.id === modalidad)?.label || modalidad}`,
        `Tipo de clase: ${bookingClassTypeOptions.find((option) => option.id === tipoClase)?.label || tipoClase}`,
        `Fechas: ${selectedDates.join(", ")}`,
        `Horario: ${startTime} a ${endTime}`,
        `Pack: ${showPackPromotions ? selectedPack?.nombre || selectedPackId : "No"}`,
        "",
        "Información adicional (podés escribir aquí): ",
      ].filter((line) => line !== "");
      const whatsappNumber = String(data.reservation?.whatsappNumber || settings.whatsappNumber || "").replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageLines.join("\n"))}`;

      setBookingMessage("Reserva pendiente. El horario quedó bloqueado durante 15 minutos mientras Silvi confirma la transferencia.");
      setSubmitState("ready");
      setStudent(initialStudentForm);
      setSelectedTopicIds([]);
      setCustomTopics([]);
      setSelectedDates([]);
      setStartTime("");
      setSelectedObjectiveIds([]);
      setModalidad("");
      setTipoClase("");
      setShowPackPromotions(false);
      setSelectedPackId("");
      setSpecificTopicNotes("");
      setAvailabilities({});
      setIsStudentModalOpen(false);
      window.location.href = whatsappUrl;
    } catch (error) {
      setBookingMessage(
        error instanceof Error && error.message === "SLOT_FULL"
          ? "Ese horario ya no tiene cupo disponible."
          : error instanceof Error && error.message === "STUDENT_EXISTS"
            ? "No estás logueado como usuario y ya existe un alumno registrado con ese DNI. Contacta por WhatsApp para continuar la reserva."
          : "No pudimos crear la reserva. Revisa los datos e intenta nuevamente.",
      );
      setSubmitState("error");
    }
  }

  return (
    <section className="section booking-section" id="silvi">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : null}
        <h2>{heading?.title || ""}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/subjects" label="Editar materias" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/topics" label="Editar temarios" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/booking-filter-options" label="Editar niveles, años y tipos" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/booking-time-slots" label="Editar horarios" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/settings" label="Editar precios y cupos" />
      </div>

      <div className="booking-search-layout" id="elegir-temarios">
        <section className="booking-filter-column" aria-label="Materia">
          <div className="booking-column-heading">
            <h3>Materia</h3>
            <span>{subjects.length}</span>
          </div>
          <div className="booking-choice-list">
            <button
              className={!selectedSubjectId ? "selected" : ""}
              type="button"
              onClick={() => {
                setSelectedSubjectId("");
              }}
            >
              Todas
            </button>
            {subjects.map((subject) => (
              <button
                className={selectedSubjectId === subject.id ? "selected" : ""}
                key={subject.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(subject.id);
                }}
              >
                {subject.name}
              </button>
            ))}
            {subjects.length === 0 ? (
              <>
                {["Matemática", "Física", "Química", "Biología", "Ciencias Naturales"].map((subject) => (
                  <button disabled key={subject} type="button">
                    {subject}
                  </button>
                ))}
                <p className="muted">Cargá materias desde el panel de administración.</p>
              </>
            ) : null}
          </div>
          <SectionState
            state={topicsState === "error" || subjectsState === "error" ? "error" : topicsState === "loading" || subjectsState === "loading" ? "loading" : "ready"}
            emptyText={topics.length === 0 ? "No hay temarios para reservar todavía." : undefined}
          />
        </section>

        <section className="booking-filter-column" aria-label="Nivel">
          <h3>Nivel</h3>
          <div className="booking-choice-list">
            <button
              className={!selectedLevelId ? "selected" : ""}
              type="button"
              onClick={() => {
                setSelectedLevelId("");
                setSelectedYearId("");
                setSelectedTrackId("");
              }}
            >
              Todos
            </button>
            {bookingLevels.map((option) => (
              <button
                className={selectedLevelId === option.id ? "selected" : ""}
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedLevelId(option.id);
                  setSelectedYearId("");
                  setSelectedTrackId("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <SectionState
            state={bookingFilterOptionsState}
            emptyText={bookingLevels.length === 0 ? "No hay niveles cargados todavía." : undefined}
          />
        </section>

        <section className="booking-filter-column" aria-label="Año">
          <h3>Año</h3>
          <div className="booking-choice-list">
            <button
              className={!selectedYearId ? "selected" : ""}
              type="button"
              onClick={() => {
                setSelectedYearId("");
                setSelectedTrackId("");
              }}
            >
              Todos
            </button>
            {topicYears.map((option) => (
              <button
                className={selectedYearId === option.id ? "selected" : ""}
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedYearId(option.id);
                  setSelectedTrackId("");
                }}
              >
                {option.label}
              </button>
            ))}
            {!selectedLevelId ? <p className="muted">Elegí un nivel para ver sus años.</p> : null}
          </div>
        </section>

        <section className="booking-filter-column" aria-label="Tipo">
          <h3>Tipo</h3>
          <div className="booking-choice-list">
            <button
              className={!selectedTrackId ? "selected" : ""}
              type="button"
              onClick={() => setSelectedTrackId("")}
            >
              Todos
            </button>
            {topicTracks.map((option) => (
              <button
                className={selectedTrackId === option.id ? "selected" : ""}
                key={option.id}
                type="button"
                onClick={() => setSelectedTrackId(option.id)}
              >
                {option.label}
              </button>
            ))}
            {!selectedLevelId ? <p className="muted">Elegí un nivel para ver sus tipos.</p> : null}
            {selectedLevelId && topicTracks.length === 0 ? <p className="muted">Sin tipos para este nivel.</p> : null}
          </div>
        </section>

        <section className="booking-filter-column booking-topic-column" aria-label="Temas particulares">
          <div className="booking-column-heading">
            <h3>Temas particulares</h3>
            <span>{totalSelectedTopicCount}/{filteredTopics.length}</span>
          </div>
          <label>
            Buscar tema
            <input
              value={topicQuery}
              onChange={(event) => setTopicQuery(event.target.value)}
              placeholder="Funciones, ácidos, lectura"
            />
          </label>
          <button
            className="secondary-action booking-add-topic"
            type="button"
            onClick={addCustomTopic}
            disabled={!canAddCustomTopic}
          >
            Agregar tema
          </button>
          {customTopics.length > 0 ? (
            <div className="booking-custom-topic-list" aria-label="Temas agregados">
              {customTopics.map((topic) => (
                <button key={topic.clientId} type="button" onClick={() => removeCustomTopic(topic.clientId)}>
                  <strong>{topic.title}</strong>
                </button>
              ))}
            </div>
          ) : null}
          <div className="booking-choice-list booking-topic-choice-list">
            {filteredTopics.map((topic) => (
              <button
                aria-pressed={selectedTopicIds.includes(topic.id)}
                className={`booking-topic-choice ${selectedTopicIds.includes(topic.id) ? "selected" : ""}`}
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
              >
                <span>
                  <strong>{bookingTopicTitle(topic)}</strong>
                </span>
              </button>
            ))}
            {filteredTopics.length === 0 ? <p className="muted">No hay coincidencias.</p> : null}
          </div>
          <label>
            Temas específicos
            <textarea
              className="booking-topic-notes"
              value={specificTopicNotes}
              onChange={(event) => setSpecificTopicNotes(event.target.value)}
              placeholder="Ej. traer ejercicios de integrales, repasar guía del colegio..."
            />
          </label>
        </section>

        <section className="booking-preferences-column" aria-label="Preferencias de la clase">
          <div>
            <h3>Objetivos</h3>
            <div className="booking-check-grid">
              {bookingObjectiveOptions.map((option) => (
                <label className="booking-check-option" key={option.id}>
                  <input
                    checked={selectedObjectiveIds.includes(option.id)}
                    onChange={() => toggleObjective(option.id)}
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <fieldset className="booking-radio-group">
            <legend>Modalidad</legend>
            {bookingModalityOptions.map((option) => (
              <label className="booking-radio-option" key={option.id}>
                <input
                  checked={modalidad === option.id}
                  name="modalidad"
                  onChange={() => setModalidad(option.id)}
                  type="radio"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="booking-radio-group">
            <legend>Tipo de clase</legend>
            {bookingClassTypeOptions.map((option) => (
              <label className="booking-radio-option" key={option.id}>
                <input
                  checked={tipoClase === option.id}
                  name="tipoClase"
                  onChange={() => setTipoClase(option.id)}
                  type="radio"
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="booking-calendar-column" aria-label="Calendario de selección de día y hora">
          <div className="booking-calendar-heading">
            <h3>Calendario de selección de día y hora</h3>
            <span>{selectedDates.length || "0"} fechas</span>
          </div>
          <label className="booking-switch-row">
            <input
              checked={showPackPromotions}
              onChange={(event) => {
                setShowPackPromotions(event.target.checked);
                setStartTime("");
                setSelectedPackId("");
                setAvailabilities({});
              }}
              type="checkbox"
            />
            <span>Ver packs de oferta y promociones</span>
          </label>
          <div className="booking-calendar-controls">
            <label>
              Mes
              <select
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedDates([]);
                }}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            {!showPackPromotions ? (
              <label>
                Horario
                <select required value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                  <option value="">Seleccionar</option>
                  {timeSlots.items.map((slot) => (
                    <option key={slot.id} value={slot.startTime}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <SectionState
            state={timeSlots.state}
            emptyText={timeSlots.items.length === 0 ? "No hay horarios cargados todavía." : undefined}
          />
          {showPackPromotions ? (
            <div className="pack-grid" aria-label="Packs promocionales">
              {promotionalPacks.map((pack) => {
                const modalityMatches = !modalidad || pack.modalidadDisponible.includes(modalidad);
                const classTypeMatches = !tipoClase || pack.tipoClaseDisponible.includes(tipoClase);
                const isDisabled = !modalityMatches || !classTypeMatches;
                const isSelected = selectedPackId === pack.id;

                return (
                  <article className={`pack-option ${isSelected ? "selected" : ""}`} key={pack.id}>
                    <div className="pack-option-main">
                      <span className="tag">{pack.cantidadClases} clases</span>
                      <h4>{pack.nombre}</h4>
                      <p>{pack.descripcion}</p>
                      {pack.descuento ? <strong>{pack.descuento}% de descuento</strong> : null}
                    </div>
                    <div className="pack-time-list">
                      {pack.horariosDisponibles.map((slot) => (
                        <button
                          className={isSelected && startTime === slot.startTime ? "selected" : ""}
                          disabled={isDisabled}
                          key={`${pack.id}-${slot.id}`}
                          onClick={() => {
                            setSelectedPackId(pack.id);
                            setStartTime(slot.startTime);
                          }}
                          type="button"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                    {isDisabled ? (
                      <p className="source-note">No disponible para la modalidad o tipo de clase seleccionado.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          <div className="date-square-grid">
            {dateOptions.map((option) => {
              const availability = availabilities[option.value];
              const isSelected = selectedDates.includes(option.value);
              const isUnavailable = Boolean(availability && !availability.available);

              return (
                <button
                  aria-disabled={isUnavailable}
                  className={`date-square ${isSelected ? "selected" : ""} ${isUnavailable ? "unavailable" : ""}`}
                  disabled={isUnavailable && !isSelected}
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isUnavailable && !isSelected) return;
                    toggleDate(option.value);
                  }}
                >
                  <span>{option.weekday}</span>
                  <strong>{option.day}</strong>
                  <small>{isUnavailable ? availability?.reason === "RESERVATION_PENDING" ? "Reserva pendiente" : "Ocupado" : option.month}</small>
                </button>
              );
            })}
          </div>
          <div className="availability-box">
            {availabilityState === "loading" ? <span>Consultando disponibilidad...</span> : null}
            {availabilityState === "error" ? <span>No pudimos consultar disponibilidad.</span> : null}
            {selectedDates.length > 0 && availabilityState === "ready" ? (
              <div className="availability-list">
                {selectedDates.map((date) => {
                  const availability = availabilities[date];

                  return (
                    <span className={availability?.available ? "ok-text" : "error-text"} key={date}>
                      {date}:{" "}
                      {availability?.available
                        ? `disponible (${availability.booked}/${availability.capacity})`
                        : availability?.reason === "PAST_SLOT"
                          ? "horario pasado"
                          : availability?.reason === "RESERVATION_PENDING"
                            ? `reserva pendiente · ${pendingTimeLeft(availability.expiresAt)}`
                            : "sin cupo"}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="booking-inline-summary">
            <h3>Resumen</h3>
            <dl>
              <dt>Temarios</dt>
              <dd>{totalSelectedTopicCount}</dd>
              <dt>Objetivos</dt>
              <dd>
                {selectedObjectiveIds.length
                  ? selectedObjectiveIds
                      .map((id) => bookingObjectiveOptions.find((option) => option.id === id)?.label)
                      .filter(Boolean)
                      .join(", ")
                  : "Sin seleccionar"}
              </dd>
              <dt>Modalidad</dt>
              <dd>{bookingModalityOptions.find((option) => option.id === modalidad)?.label || "Sin seleccionar"}</dd>
              <dt>Tipo de clase</dt>
              <dd>
                {bookingClassTypeOptions.find((option) => option.id === tipoClase)?.label || "Sin seleccionar"}
              </dd>
              <dt>Pack</dt>
              <dd>{showPackPromotions ? selectedPack?.nombre || "Sin seleccionar" : "No"}</dd>
              <dt>Fechas</dt>
              <dd>{selectedDates.length || "Sin seleccionar"}</dd>
              <dt>Duración estimada</dt>
              <dd>{hours} h</dd>
              <dt>Horario</dt>
              <dd>{startTime ? `${startTime} a ${selectedAvailability[0]?.endTime || endTime}` : "Sin seleccionar"}</dd>
              <dt>Monto estimado</dt>
              <dd>{formatCurrency(estimatedAmount * Math.max(1, selectedDates.length))}</dd>
              <dt>WhatsApp</dt>
              <dd>{settings.whatsappNumber || "A confirmar"}</dd>
            </dl>
            {selectedTopics.length || customTopics.length ? (
              <ul className="summary-list">
                {selectedTopics.map((topic) => (
                  <li key={topic.id}>{bookingTopicTitle(topic)}</li>
                ))}
                {customTopics.map((topic) => (
                  <li key={topic.clientId}>{topic.title}</li>
                ))}
              </ul>
            ) : null}
            <section className="booking-policy-box" aria-label="Política de cancelación y condiciones">
              <h3>Política de cancelación y condiciones</h3>
              <p>
                Podés cancelar la clase hasta 12 horas antes del horario reservado y se te devolverá el 100% de lo
                abonado. Pasado ese límite, no se realizará devolución.
              </p>
              <p>
                Los packs se abonan del día 1 al 10 de cada mes, sin excepción. En caso de no abonarse dentro de ese
                período, se dará de baja al alumno.
              </p>
              <p>Si se pierden clases, se podrán recuperar de forma presencial o virtual, según disponibilidad.</p>
              <p>
                El costo del material imprimible en dossier no está incluido en el pack, pero tiene un 20% de descuento
                por ser miembro.
              </p>
            </section>
            <p className="muted">
              {currentUser
                ? `Estás logueado como ${currentUser.email}. El horario se bloqueará 15 minutos mientras Silvi confirma la transferencia.`
                : "El horario se bloqueará 15 minutos. Se abrirá WhatsApp con todos los datos de la solicitud para que puedas agregar lo que quieras."}
            </p>
            <button
              className="primary-action button-action"
              type="button"
              onClick={() => setIsStudentModalOpen(true)}
              disabled={
                submitState === "loading" ||
                totalSelectedTopicCount === 0 ||
                !hasRequiredBookingPreferences ||
                selectedDates.length === 0 ||
                !startTime ||
                !allSelectedDatesAvailable ||
                !hasRequiredPackSelection ||
                settings.pricePerHour === undefined
              }
            >
              Completar alumno
            </button>
            {bookingMessage ? (
              <p className={submitState === "error" ? "error-text" : "ok-text"}>{bookingMessage}</p>
            ) : null}
          </div>
        </section>
      </div>

      {isStudentModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
          <form className="student-modal" onSubmit={submitBooking}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Datos del alumno</p>
                <h3 id="student-modal-title">Completar para reservar</h3>
              </div>
              <button type="button" className="icon-close" onClick={() => setIsStudentModalOpen(false)}>
                x
              </button>
            </div>
            <div className="form-grid">
              <label>
                Nombre
                <input required value={student.firstName} onChange={(e) => updateStudent("firstName", e.target.value)} />
              </label>
              <label>
                Apellido
                <input required value={student.lastName} onChange={(e) => updateStudent("lastName", e.target.value)} />
              </label>
              <label>
                DNI
                <input required value={student.dni} onChange={(e) => updateStudent("dni", e.target.value)} />
              </label>
              <label>
                Teléfono
                <input value={student.phone} onChange={(e) => updateStudent("phone", e.target.value)} />
              </label>
              <label className="full-field">
                Dirección
                <input required value={student.address} onChange={(e) => updateStudent("address", e.target.value)} />
              </label>
              <label>
                Responsable
                <input
                  required
                  value={student.responsibleName}
                  onChange={(e) => updateStudent("responsibleName", e.target.value)}
                />
              </label>
              <label>
                Contacto responsable
                <input
                  required
                  value={student.responsibleContact}
                  onChange={(e) => updateStudent("responsibleContact", e.target.value)}
                />
              </label>
            </div>
            <p className="muted">
              Si el DNI ya existe, el sistema avisará que no estás logueado como usuario y que ese
              alumno ya está registrado.
            </p>
            <button className="primary-action button-action" type="submit" disabled={submitState === "loading"}>
              {submitState === "loading" ? "Creando..." : "Solicitar clase por WhatsApp"}
            </button>
            {bookingMessage ? (
              <p className={submitState === "error" ? "error-text" : "ok-text"}>{bookingMessage}</p>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}

function uniqueTopicValues(topics: Topic[], key: "educationLevel" | "educationTrack" | "schoolYear" | "subject") {
  return Array.from(new Set(topics.map((topic) => topic[key]).filter(Boolean) as string[])).sort(
    (a, b) => a.localeCompare(b, "es-AR", { numeric: true }),
  );
}

function buildDateOptions(totalDays: number) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const parts = formatter.formatToParts(date);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    return {
      value,
      weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
      day: parts.find((part) => part.type === "day")?.value ?? "",
      month: parts.find((part) => part.type === "month")?.value ?? "",
    };
  });
}

function getMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthOptions(totalMonths: number) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  });
  const today = new Date();

  return Array.from({ length: totalMonths }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1);

    return {
      value: getMonthValue(date),
      label: formatter.format(date),
    };
  });
}

function buildDateOptionsForMonth(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const daysInMonth = new Date(year, month, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);

    if (date < today) {
      return null;
    }

    const parts = formatter.formatToParts(date);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    return {
      value,
      weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
      day: parts.find((part) => part.type === "day")?.value ?? "",
      month: parts.find((part) => part.type === "month")?.value ?? "",
    };
  }).filter((option): option is { value: string; weekday: string; day: string; month: string } =>
    Boolean(option),
  );
}

function calculateBookingHours(totalTopics: number, topicsPerHour: number) {
  return Math.max(1, Math.ceil(totalTopics / Math.max(1, topicsPerHour)));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
