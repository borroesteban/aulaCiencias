import { StrictMode, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./admin";
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
  mapUrl: string | null;
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
  subjectWindowIntervalSeconds: number;
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
  subjectWindowIntervalSeconds: 5,
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
  title: string;
  keywords: string[];
  definition: string;
  professions: string[];
  jobs: string[];
  imageUrl: string;
}

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

function subjectWindowSpeedToIntervalMs(value: number) {
  const speed = Math.min(50, Math.max(1, Number(value || 5)));
  const slowness = (50 - speed) / 49;

  return Math.round(1000 + 59000 * Math.pow(slowness, 1.8));
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
  const subjectHighlights = useApiList<SubjectWindowItem>("/api/subject-highlights");
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

  if (route.startsWith("#/admin")) {
    return <AdminApp />;
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
          <GlossarySection header={content.glossaryHeader} items={subjectHighlights.items} state={subjectHighlights.state} />
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
          carouselImages={parseImageList(settings.carouselImages)}
          heading={content.subjectCarousel}
          items={subjectHighlights.items}
          state={subjectHighlights.state}
          intervalSeconds={settings.subjectWindowIntervalSeconds}
          isAdmin={isAdmin}
        />

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

        <TopicsSection heading={content.topics} topics={topics} />

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
  intervalSeconds,
  isAdmin,
}: {
  carouselImages: string[];
  heading: ContentBlock | null;
  items: SubjectWindowItem[];
  state: LoadState;
  intervalSeconds: number;
  isAdmin: boolean;
}) {
  const [windowItems, setWindowItems] = useState<SubjectWindowItem[]>([]);
  const [flippingSlots, setFlippingSlots] = useState<number[]>([]);
  const [flipModes, setFlipModes] = useState<Record<number, "x" | "y">>({});

  useEffect(() => {
    if (items.length === 0) {
      setWindowItems([]);
      return;
    }

    const timers: number[] = [];
    const totalWindows = 12;
    const baseIntervalMs = subjectWindowSpeedToIntervalMs(intervalSeconds);

    function flipSlot(slot: number) {
      setFlipModes((current) => ({ ...current, [slot]: Math.random() > 0.5 ? "x" : "y" }));
      setFlippingSlots((current) => (current.includes(slot) ? current : [...current, slot]));
      window.setTimeout(() => {
        setWindowItems((current) => {
          const next = [...current];
          const visibleTitles = new Set(next.map((item) => item.title));
          const currentTitle = next[slot]?.title;
          const candidates = items.filter(
            (item) => item.title !== currentTitle && !visibleTitles.has(item.title),
          );
          const fallbackCandidates = items.filter((item) => item.title !== currentTitle);
          const pool = candidates.length ? candidates : fallbackCandidates;

          if (pool.length > 0) {
            next[slot] = pool[Math.floor(Math.random() * pool.length)];
          }

          return next;
        });
      }, 900);

      window.setTimeout(() => {
        setFlippingSlots((current) => current.filter((item) => item !== slot));
      }, 1800);
    }

    Array.from({ length: totalWindows }, (_, slot) => {
      const firstDelay = Math.round((slot * baseIntervalMs) / totalWindows);

      timers.push(
        window.setTimeout(() => {
          flipSlot(slot);
          timers.push(window.setInterval(() => flipSlot(slot), baseIntervalMs));
        }, firstDelay),
      );
    });

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [intervalSeconds, items]);

  useEffect(() => {
    setWindowItems(items.length ? Array.from({ length: 12 }, (_, index) => items[index % items.length]) : []);
  }, [items]);

  return (
    <section className="subject-carousel-section" aria-labelledby="materias-title">
      <div className="section-heading subject-carousel-heading">
        <h2 id="materias-title">{heading?.title || ""}</h2>
        <AdminEditLink isAdmin={isAdmin} href="#/admin/subject-highlights" label="Editar carrusel" />
      </div>

      <div className="subject-window-carousel" aria-label="Campos del conocimiento">
        {windowItems.map((item, index) => (
          <a
            className={`subject-window ${flippingSlots.includes(index) ? `flipping flip-${flipModes[index] || "y"}` : ""}`}
            href={`/glosario#materia-${slugify(item.title)}`}
            key={`subject-window-${index}`}
          >
            <div className="subject-window-inner">
              <img src={carouselImages[index % carouselImages.length] || item.imageUrl} alt={item.title} />
              <div>
                <h3>{item.title}</h3>
              </div>
            </div>
          </a>
        ))}
        <SectionState state={state} emptyText={items.length === 0 ? "No hay campos publicados todavía." : undefined} />
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
          <article className="subject-definition" id={`materia-${slugify(item.title)}`} key={item.title}>
            <span className="tag">{item.title}</span>
            <h3>{item.title}</h3>
            <p>{item.definition}</p>
            <dl>
              <dt>Profesiones relacionadas</dt>
              <dd>{item.professions.join(" · ")}</dd>
              <dt>Trabajos comunes</dt>
              <dd>{item.jobs.join(" · ")}</dd>
            </dl>
          </article>
        ))}
      </div>
      <SectionState state={state} emptyText={items.length === 0 ? "No hay definiciones publicadas todavía." : undefined} />
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
              <iframe
                key={selectedSchool.id}
                title={`Mapa de ${selectedSchool.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${selectedSchool.name} ${selectedSchool.address || ""}`,
                )}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
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

        <div className="booking-panel">
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
