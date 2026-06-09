import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import { AdminApp } from "./admin";
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
  mercadoPagoAlias: string | null;
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
  mercadoPagoAlias: null,
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
  levels: { id: string; levelName: string; content: string; examples: string | null }[];
  media: { id: string; type: string; title: string | null; description: string | null; url: string | null; altText: string | null }[];
  sources: { id: string; title: string; author: string | null; institution: string | null; url: string | null; sourceType: string | null; accessDate: string | null }[];
  relatedTopics: { title: string; slug: string; relationLabel: string | null }[];
}

interface StudyProgram {
  id: string;
  name: string;
  academicLevel: string;
  titleGranted: string | null;
  duration: string | null;
  modality: string | null;
  description: string | null;
  website: string | null;
  institutionName: string;
  institutionPhone: string | null;
  institutionEmail: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  topics: { id: string; name: string; normalizedName: string }[];
}

interface SubjectWindowCard {
  slotKey: string;
  subjectKey: string;
  title: string;
  slugTitle: string;
  imageUrl: string;
}

const subjectWindowLoopCopies = 4;

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

const subjectFallbackImages: Record<string, string> = {
  matematica: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
  biologia: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=900&q=80",
  quimica: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
  fisica: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=900&q=80",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  return subjectFallbackImages[subjectKey] || fallbackImages[0] || "";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function repeatLoop<T>(items: T[]) {
  return Array.from({ length: subjectWindowLoopCopies }, () => items).flat();
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
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='/']");

      if (!link || link.origin !== window.location.origin) {
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
  const topics = useApiList<Topic>("/api/topics?limit=50");
  const schools = useApiList<School>("/api/schools?limit=50");
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

  if (route.startsWith("#/admin")) {
    return <AdminApp />;
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

        <StudySection />

        <SchoolsSection heading={content.schools} schools={schools} isAdmin={isAdmin} />

        <BookingSection
          heading={content.booking}
          timeSlots={bookingTimeSlots}
          topics={topics.items}
          topicsState={topics.state}
          settings={settings}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      </main>

      <footer className="site-footer">
        <span>{settings.siteTitle}</span>
        {settings.whatsappNumber ? <span>WhatsApp {settings.whatsappNumber}</span> : null}
      </footer>
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
  const allImages = useMemo(
    () =>
      uniqueValues([
        ...items.map((item) => item.imageUrl),
        ...carouselImages,
        ...Object.values(subjectFallbackImages),
      ]),
    [carouselImages, items],
  );

  function pickImage(subjectKey: string, preferredImages: string[], usedImages: Set<string>) {
    const pool = uniqueValues([
      ...preferredImages,
      subjectWindowFallbackImage(subjectKey, allImages),
      ...allImages,
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

    return Array.from({ length: rowCount }, (_, rowIndex) =>
      subjectItems
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
    );
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

    function flipSlot(slot: number) {
      if (isCancelled) {
        return;
      }

      setFlipModes((current) => ({ ...current, [slot]: Math.random() > 0.5 ? "x" : "y" }));
      setFlippingSlots((current) => (current.includes(slot) ? current : [...current, slot]));
      timers.push(window.setTimeout(() => {
        setWindowRows((current) => current);
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
  }, [initialWindowRows, pauseMs, rotationMs, subjectItems]);

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
              <a className="primary-action" href={`/?solicitar=${encodeURIComponent(item.slug || item.title)}#elegir-temarios`}>
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
        document.title = data.article.seoTitle || `${data.article.title} - aulaCiencias`;
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

  return (
    <article className="section glossary-article-page">
      <div className="glossary-article-hero">
        <div>
          <p className="eyebrow">Glosario</p>
          <h1>{article.title}</h1>
          {article.summary ? <p>{article.summary}</p> : null}
          <div className="definition-actions">
            <a className="primary-action" href={`/?solicitar=${encodeURIComponent(article.slug)}#elegir-temarios`}>
              Solicitar una clase sobre este tema
            </a>
            <a className="secondary-action" href="/">Volver al inicio</a>
          </div>
        </div>
        {article.imageUrl ? <img src={article.imageUrl} alt={article.title} loading="lazy" /> : null}
      </div>

      <div className="glossary-article-body">
        {article.introduction ? <section><h2>Introducción</h2><p>{article.introduction}</p></section> : null}
        {article.fullDefinition ? <section><h2>Definición desarrollada</h2><p>{article.fullDefinition}</p></section> : null}
        {article.body ? <section><h2>Desarrollo</h2><p>{article.body}</p></section> : null}
        {article.levels.length ? (
          <section>
            <h2>Explicación por niveles</h2>
            <div className="article-level-grid">
              {article.levels.map((level) => (
                <article className="info-card" key={level.id}>
                  <h3>{level.levelName}</h3>
                  <p>{level.content}</p>
                  {level.examples ? <p><strong>Ejemplos:</strong> {level.examples}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {article.media.length ? (
          <section>
            <h2>Recursos visuales</h2>
            <div className="gallery-grid">
              {article.media.map((item) => (
                <article className="resource-card" key={item.id}>
                  {item.url ? <img src={item.url} alt={item.altText || item.title || ""} loading="lazy" /> : null}
                  <div className="card-body">
                    <h3>{item.title || item.type}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <ArticleListSection title="Ejemplos" items={article.examples} />
        <ArticleListSection title="Errores comunes" items={article.commonMistakes} />
        <ArticleListSection title="Aplicaciones" items={article.applications} />
        <ArticleListSection title="Relación con otros conceptos" items={article.relatedConcepts} />
        {article.relatedTopics.length ? (
          <section>
            <h2>Temas relacionados</h2>
            <div className="definition-actions">
              {article.relatedTopics.map((topic) => (
                <a className="text-action" href={`/glosario/${topic.slug}`} key={topic.slug}>
                  {topic.title}
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {article.conclusion ? <section><h2>Resumen final</h2><p>{article.conclusion}</p></section> : null}
        {article.sources.length ? (
          <section>
            <h2>Fuentes citadas</h2>
            <ol className="source-list">
              {article.sources.map((source) => (
                <li key={source.id}>
                  {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}
                  {[source.institution, source.sourceType, source.accessDate].filter(Boolean).join(" · ")}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function ArticleListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <section>
      <h2>{title}</h2>
      <ul className="summary-list">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function StudySection() {
  const [query, setQuery] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [includeTopic, setIncludeTopic] = useState("");
  const [excludeTopic, setExcludeTopic] = useState("");
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const levels = useApiList<string>("/api/study/academic-levels");
  const studyTopics = useApiList<{ normalizedName: string; name: string }>("/api/study/topics");

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams({ limit: "80", offset: "0" });

    if (query.trim()) params.set("q", query.trim());
    if (academicLevel) params.set("academicLevel", academicLevel);
    if (includeTopic) params.set("includeTopics", includeTopic);
    if (excludeTopic) params.set("excludeTopics", excludeTopic);

    setState("loading");
    apiGet<{ items: StudyProgram[]; total: number }>(`/api/study/programs?${params}`)
      .then((data) => {
        if (!isMounted) return;
        setPrograms(data.items);
        setTotal(data.total);
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [academicLevel, excludeTopic, includeTopic, query]);

  return (
    <section className="section study-section" id="elegir-que-estudiar">
      <div className="section-heading">
        <p className="eyebrow">Orientación académica</p>
        <h2>Elegir qué estudiar</h2>
        <p>
          Carreras e instituciones de Gualeguaychú cargadas desde fuentes verificables, con filtros para cruzar
          intereses, temas y niveles de formación.
        </p>
      </div>

      <div className="study-filter-bar">
        <label>
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Carrera, institución o tema"
          />
        </label>
        <label>
          Nivel
          <select value={academicLevel} onChange={(event) => setAcademicLevel(event.target.value)}>
            <option value="">Todos</option>
            {levels.items.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label>
          Incluir tema
          <select value={includeTopic} onChange={(event) => setIncludeTopic(event.target.value)}>
            <option value="">Cualquier tema</option>
            {studyTopics.items.map((topic) => (
              <option key={topic.normalizedName} value={topic.name}>{topic.name}</option>
            ))}
          </select>
        </label>
        <label>
          Evitar tema
          <select value={excludeTopic} onChange={(event) => setExcludeTopic(event.target.value)}>
            <option value="">Ninguno</option>
            {studyTopics.items.map((topic) => (
              <option key={topic.normalizedName} value={topic.name}>{topic.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="study-results-header">
        <span>{total} opción(es) encontradas</span>
        {(query || academicLevel || includeTopic || excludeTopic) ? (
          <button
            className="secondary-action"
            type="button"
            onClick={() => {
              setQuery("");
              setAcademicLevel("");
              setIncludeTopic("");
              setExcludeTopic("");
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="study-program-grid">
        {programs.map((program) => (
          <article className="info-card study-program-card" key={program.id}>
            <span className="tag">{program.academicLevel}</span>
            <h3>{program.name}</h3>
            <p className="topic-meta">{program.institutionName}</p>
            {program.description ? <p>{program.description}</p> : null}
            <dl>
              {program.titleGranted ? <><dt>Título</dt><dd>{program.titleGranted}</dd></> : null}
              {program.duration ? <><dt>Duración</dt><dd>{program.duration}</dd></> : null}
              {program.modality ? <><dt>Modalidad</dt><dd>{program.modality}</dd></> : null}
              <dt>Contacto</dt>
              <dd>{[program.institutionPhone, program.institutionEmail].filter(Boolean).join(" · ") || "No informado"}</dd>
            </dl>
            <div className="study-topic-list">
              {program.topics.map((topic) => <span key={topic.id}>{topic.name}</span>)}
            </div>
            <div className="definition-actions">
              {program.website ? <a className="text-action" href={program.website} target="_blank" rel="noreferrer">Ver carrera</a> : null}
              {program.sourceUrl ? <a className="text-action" href={program.sourceUrl} target="_blank" rel="noreferrer">Fuente</a> : null}
            </div>
            {program.sourceName ? (
              <p className="source-note">
                Fuente: {program.sourceName}
                {program.lastVerifiedAt ? ` · verificado ${program.lastVerifiedAt}` : ""}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <SectionState state={state} emptyText={programs.length === 0 ? "No hay opciones con esos filtros." : undefined} />
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
          <a className="brand" href="#inicio">aulaCiencias</a>
          <button type="button" className="icon-close" onClick={onClose}>x</button>
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
            {mode === "login" ? "Crear usuario comun" : "Ya tengo usuario"}
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
  return (
    <section className="section" id="descargables">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : null}
        <h2>{heading?.title || ""}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/downloadables" label="Editar descargables y categorías" />
      </div>

      <div className="carousel" aria-label="Fotos recientes">
        {(recent.items.length > 0 ? [...recent.items, ...recent.items] : []).map((item, index) => (
          <article className="carousel-card" key={`${item.id}-${index}`}>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="image-fallback" />}
            <div>
              <strong>{item.title}</strong>
              <span>{item.categoryName}</span>
            </div>
          </article>
        ))}
        <SectionState
          state={recent.state}
          emptyText={recent.items.length === 0 ? "Todavia no hay fotos recientes." : undefined}
        />
      </div>

      <div className="filters">
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

      <div className="gallery-grid">
        {downloadables.items.map((item) => (
          <article className="resource-card" key={item.id}>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="image-fallback" />}
            <div className="card-body">
              <span className="tag">{item.categoryName}</span>
              <h3>{item.title}</h3>
              {item.description ? <p>{item.description}</p> : null}
              {item.imageUrl ? (
                <a className="text-action" href={item.imageUrl} download target="_blank" rel="noreferrer">
                  Descargar imagen
                </a>
              ) : (
                <span className="muted">Sin imagen disponible</span>
              )}
              <AdminEditLink isAdmin={isAdmin} href="#/admin/downloadables" label="Editar" />
            </div>
          </article>
        ))}
      </div>
      <SectionState
        state={downloadables.state}
        emptyText={downloadables.items.length === 0 ? "No hay contenido para este filtro." : undefined}
      />
    </section>
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

function LeafletSchoolMap({ school }: { school: School }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const latitude = Number(school.latitude);
  const longitude = Number(school.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const position: [number, number] = hasCoordinates ? [latitude, longitude] : gualeguaychuCenter;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: position,
      zoom: hasCoordinates ? 15 : 13,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "school-map-marker",
      html: "",
      iconAnchor: [9, 9],
      iconSize: [18, 18],
    });

    markerRef.current = L.marker(position, { icon }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker) {
      return;
    }

    marker.setLatLng(position);
    marker.bindPopup(hasCoordinates ? school.name : "Gualeguaychú");
    map.setView(position, hasCoordinates ? 15 : 13, { animate: true });
  }, [hasCoordinates, position[0], position[1], school.name]);

  return (
    <div className="leaflet-school-map-wrap">
      <div className="leaflet-school-map" ref={containerRef} aria-label={`Mapa de ${school.name}`} />
      {!hasCoordinates ? (
        <p className="source-note">Ubicación aproximada de la ciudad. Este colegio todavía no tiene coordenadas cargadas.</p>
      ) : null}
    </div>
  );
}

function SchoolsSection({
  heading,
  schools,
  isAdmin,
}: {
  heading: ContentBlock | null;
  schools: ReturnType<typeof useApiList<School>>;
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSchools = schools.items.filter((school) => {
    if (!normalizedSearch) return true;

    return [school.name, school.level, school.managementType, school.address, school.generalInfo]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });
  const selectedSchool =
    schools.items.find((school) => school.id === selectedSchoolId) ?? filteredSchools[0] ?? null;

  return (
    <section className="section" id="colegios">
      <div className="section-heading">
        {heading?.eyebrow ? <p className="eyebrow">{heading.eyebrow}</p> : null}
        <h2>{heading?.title || ""}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/schools" label="Editar colegios" />
      </div>

      <div className="school-picker">
        <div className="school-combobox">
          <label>
            Colegio
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Escribi para buscar por nombre, nivel, gestion o direccion"
            />
          </label>
          <button className="secondary-action" type="button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? "Cerrar lista" : "Abrir lista"}
          </button>
          {isOpen ? (
            <div className="school-dropdown" role="listbox">
              {filteredSchools.map((school) => (
                <button
                  className={selectedSchool?.id === school.id ? "selected" : ""}
                  key={school.id}
                  type="button"
                  onClick={() => {
                    setSelectedSchoolId(school.id);
                    setSearch(school.name);
                    setIsOpen(false);
                  }}
                >
                  <strong>{school.name}</strong>
                  <span>{[school.level, school.managementType].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
              {filteredSchools.length === 0 ? <p className="muted">No hay coincidencias.</p> : null}
            </div>
          ) : null}
        </div>

        {selectedSchool ? (
          <article className="info-card school-card selected-school-card">
            <div>
              <span className="tag">
                {[selectedSchool.level, selectedSchool.managementType].filter(Boolean).join(" · ") ||
                  "Colegio"}
              </span>
              <h3>{selectedSchool.name}</h3>
              {selectedSchool.generalInfo ? <p>{selectedSchool.generalInfo}</p> : null}
              <AdminEditLink isAdmin={isAdmin} href="#/admin/schools" label="Editar colegio" />
            </div>
            <dl>
              {selectedSchool.address ? (
                <>
                  <dt>Dirección</dt>
                  <dd>{selectedSchool.address}</dd>
                </>
              ) : null}
              <dt>Teléfono</dt>
              <dd>{selectedSchool.phone || "No informado"}</dd>
              <dt>Correo</dt>
              <dd>{selectedSchool.email || "No informado"}</dd>
            </dl>
            <div className="school-map-panel">
              <h4>Mapa</h4>
              <LeafletSchoolMap school={selectedSchool} />
            </div>
          </article>
        ) : null}
      </div>
      <SectionState
        state={schools.state}
        emptyText={schools.items.length === 0 ? "Todavia no hay colegios cargados." : undefined}
      />
    </section>
  );
}

function BookingSection({
  heading,
  timeSlots,
  topics,
  topicsState,
  settings,
  currentUser,
  isAdmin,
}: {
  heading: ContentBlock | null;
  timeSlots: ReturnType<typeof useApiList<BookingTimeSlot>>;
  topics: Topic[];
  topicsState: LoadState;
  settings: PublicSettings;
  currentUser: AuthUser | null;
  isAdmin: boolean;
}) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue(new Date()));
  const [startTime, setStartTime] = useState("");
  const [topicLevel, setTopicLevel] = useState("");
  const [topicTrack, setTopicTrack] = useState("");
  const [topicYear, setTopicYear] = useState("");
  const [topicSubject, setTopicSubject] = useState("");
  const [student, setStudent] = useState<StudentForm>(initialStudentForm);
  const [availabilities, setAvailabilities] = useState<Record<string, {
    available: boolean;
    booked: number;
    capacity: number;
    endTime?: string;
    reason?: string;
  }>>({});
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [availabilityState, setAvailabilityState] = useState<LoadState>("idle");
  const [submitState, setSubmitState] = useState<LoadState>("idle");
  const [bookingMessage, setBookingMessage] = useState("");

  const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));
  const topicLevels = useMemo(() => uniqueTopicValues(topics, "educationLevel"), [topics]);
  const topicTracks = useMemo(() => uniqueTopicValues(topics, "educationTrack"), [topics]);
  const topicYears = useMemo(() => uniqueTopicValues(topics, "schoolYear"), [topics]);
  const topicSubjects = useMemo(() => uniqueTopicValues(topics, "subject"), [topics]);
  const filteredTopics = useMemo(
    () =>
      topics.filter(
        (topic) =>
          (!topicLevel || topic.educationLevel === topicLevel) &&
          (!topicTrack || topic.educationTrack === topicTrack) &&
          (!topicYear || topic.schoolYear === topicYear) &&
          (!topicSubject || topic.subject === topicSubject),
      ),
    [topicLevel, topicTrack, topicYear, topicSubject, topics],
  );

  useEffect(() => {
    const requestedTopic = new URLSearchParams(window.location.search).get("solicitar");

    if (!requestedTopic || topics.length === 0) {
      return;
    }

    const requestedKey = slugify(requestedTopic);
    const matchingTopic = topics.find((topic) =>
      [topic.title, topic.subject].some((value) => value && slugify(value).includes(requestedKey)),
    );

    if (!matchingTopic) {
      return;
    }

    setTopicSubject(matchingTopic.subject || "");
    setSelectedTopicIds((current) => (current.includes(matchingTopic.id) ? current : [matchingTopic.id]));
  }, [topics]);

  const hours = calculateBookingHours(selectedTopicIds.length, settings.topicsPerHour);
  const endTime = startTime ? addHours(startTime, hours) : "";
  const estimatedAmount = hours * Number(settings.pricePerHour || 0);
  const monthOptions = useMemo(() => buildMonthOptions(8), []);
  const dateOptions = useMemo(() => buildDateOptionsForMonth(selectedMonth), [selectedMonth]);
  const canCheckAvailability = selectedDates.length > 0 && startTime && selectedTopicIds.length > 0;
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
          topicIds: selectedTopicIds.join(","),
        });

        return apiGet<{
          available: boolean;
          booked: number;
          capacity: number;
          endTime: string;
          reason?: string;
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
  }, [canCheckAvailability, selectedDates, selectedTopicIds, startTime]);

  function toggleTopic(id: string) {
    setSelectedTopicIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
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
          student,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "BOOKING_ERROR");
      }

      setBookingMessage(
        `${data.bookings.length} reserva(s) creadas en estado PENDING_PAYMENT. Transferí al alias ${
          data.payment.alias || "a confirmar"
        } y envía WhatsApp al ${data.payment.whatsappNumber}.`,
      );
      setSubmitState("ready");
      setStudent(initialStudentForm);
      setSelectedTopicIds([]);
      setSelectedDates([]);
      setStartTime("");
      setAvailabilities({});
      setIsStudentModalOpen(false);
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
        <AdminEditLink isAdmin={isAdmin} href="#/admin/topics" label="Editar materias y temas" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/booking-time-slots" label="Editar horarios" />
        <AdminEditLink isAdmin={isAdmin} href="#/admin/settings" label="Editar precios y cupos" />
      </div>

      <div className="booking-layout">
        <div className="booking-panel">
          <h3>Lista de temas disponibles</h3>
          <div className="topic-filter-grid">
            <label>
              Nivel
              <select value={topicLevel} onChange={(event) => setTopicLevel(event.target.value)}>
                <option value="">Todos</option>
                {topicLevels.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modalidad
              <select value={topicTrack} onChange={(event) => setTopicTrack(event.target.value)}>
                <option value="">Todas</option>
                {topicTracks.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Año
              <select value={topicYear} onChange={(event) => setTopicYear(event.target.value)}>
                <option value="">Todos</option>
                {topicYears.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Materia
              <select value={topicSubject} onChange={(event) => setTopicSubject(event.target.value)}>
                <option value="">Todas</option>
                {topicSubjects.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="topic-list compact-topic-list">
            {filteredTopics.map((topic) => (
              <article className="topic-line-card" key={topic.id}>
                <span className="tag">{topic.subject || "Ciencias"}</span>
                <h4>{topic.title}</h4>
                <p className="topic-meta">
                  {[topic.educationLevel, topic.educationTrack, topic.schoolYear].filter(Boolean).join(" · ")}
                </p>
                {topic.introduction ? <p>{topic.introduction}</p> : null}
                {topic.importance ? <p><strong>Importancia:</strong> {topic.importance}</p> : null}
                {topic.relatedCareers ? (
                  <p><strong>Profesiones relacionadas:</strong> {topic.relatedCareers}</p>
                ) : null}
                <AdminEditLink isAdmin={isAdmin} href="#/admin/topics" label="Editar tema" />
              </article>
            ))}
          </div>
          <SectionState
            state={topicsState}
            emptyText={topics.length === 0 ? "No hay temarios para reservar todavía." : undefined}
          />
        </div>

        <div className="booking-panel" id="elegir-temarios">
          <h3>Elegir temarios para la reserva</h3>
          <div className="checklist">
            {filteredTopics.map((topic) => (
              <label className="check-row" key={topic.id}>
                <input
                  type="checkbox"
                  checked={selectedTopicIds.includes(topic.id)}
                  onChange={() => toggleTopic(topic.id)}
                />
                <span>
                  <strong>{topic.title}</strong>
                  <small>
                    {[topic.subject, topic.educationLevel, topic.educationTrack, topic.schoolYear]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <SectionState
            state={topicsState}
            emptyText={topics.length === 0 ? "No hay temarios para reservar todavía." : undefined}
          />
        </div>

        <div className="booking-panel">
          <h3>Fechas y horario</h3>
          <div className="form-grid one-field-grid">
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
          </div>
          <div className="date-square-grid">
            {dateOptions.map((option) => {
              const availability = availabilities[option.value];
              const isSelected = selectedDates.includes(option.value);

              return (
                <button
                  className={`date-square ${isSelected ? "selected" : ""} ${
                    availability && !availability.available ? "unavailable" : ""
                  }`}
                  key={option.value}
                  type="button"
                  onClick={() => toggleDate(option.value)}
                >
                  <span>{option.weekday}</span>
                  <strong>{option.day}</strong>
                  <small>{option.month}</small>
                </button>
              );
            })}
          </div>
          <div className="form-grid one-field-grid">
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
            <SectionState
              state={timeSlots.state}
              emptyText={timeSlots.items.length === 0 ? "No hay horarios cargados todavía." : undefined}
            />
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
                          : "sin cupo"}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="booking-summary">
          <h3>Resumen</h3>
          <dl>
            <dt>Temarios</dt>
            <dd>{selectedTopicIds.length}</dd>
            <dt>Fechas</dt>
            <dd>{selectedDates.length || "Sin seleccionar"}</dd>
            <dt>Duración estimada</dt>
            <dd>{hours} h</dd>
            <dt>Horario</dt>
            <dd>{startTime ? `${startTime} a ${selectedAvailability[0]?.endTime || endTime}` : "Sin seleccionar"}</dd>
            <dt>Monto estimado</dt>
            <dd>{formatCurrency(estimatedAmount * Math.max(1, selectedDates.length))}</dd>
            <dt>Alias de pago</dt>
            <dd>{settings.mercadoPagoAlias || "A confirmar"}</dd>
            <dt>WhatsApp</dt>
            <dd>{settings.whatsappNumber || "A confirmar"}</dd>
          </dl>
          {selectedTopics.length ? (
            <ul className="summary-list">
              {selectedTopics.map((topic) => (
                <li key={topic.id}>{topic.title}</li>
              ))}
            </ul>
          ) : null}
          <p className="muted">
            {currentUser
              ? `Estás logueado como ${currentUser.email}. La reserva queda pendiente de pago.`
              : "La reserva queda pendiente de pago. Envía WhatsApp indicando quién transfiere y para qué alumno."}
          </p>
          <button
            className="primary-action button-action"
            type="button"
            onClick={() => setIsStudentModalOpen(true)}
            disabled={
              submitState === "loading" ||
              selectedTopicIds.length === 0 ||
              selectedDates.length === 0 ||
              !allSelectedDatesAvailable ||
              settings.pricePerHour === undefined
            }
          >
            Completar alumno
          </button>
          {bookingMessage ? (
            <p className={submitState === "error" ? "error-text" : "ok-text"}>{bookingMessage}</p>
          ) : null}
        </aside>
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
              {submitState === "loading" ? "Creando..." : "Confirmar reserva"}
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
