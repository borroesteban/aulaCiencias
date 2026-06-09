import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type AdminTab =
  | "dashboard"
  | "downloadables"
  | "subjects"
  | "subject-highlights"
  | "topics"
  | "booking-time-slots"
  | "content-blocks"
  | "schools"
  | "students"
  | "guardians"
  | "bookings"
  | "settings"
  | "security";
type LoadState = "idle" | "loading" | "ready" | "error";

interface AdminUser {
  id: string;
  email: string;
  role: "SUPERADMIN" | "ADMIN" | "USER";
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Downloadable {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  categoryName?: string;
  isFeatured: boolean;
  isVisible: boolean;
}

interface Topic {
  id: string;
  title: string;
  introduction: string | null;
  importance: string | null;
  subject: string | null;
  subjectId: string | null;
  educationLevel: string | null;
  educationTrack: string | null;
  schoolYear: string | null;
  relatedCareers: string | null;
  estimatedMinutes: number;
  isVisible: boolean;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isVisible: boolean;
}

interface SubjectHighlight {
  id: string;
  subjectId: string | null;
  title: string;
  slug: string;
  keywords: string | null;
  definition: string;
  professions: string | null;
  jobs: string | null;
  imageUrl: string;
  displayOrder: number;
  isVisible: boolean;
}

interface BookingTimeSlot {
  id: string;
  startTime: string;
  label: string;
  displayOrder: number;
  isVisible: boolean;
}

interface ContentBlock {
  id: string;
  key: string;
  title: string | null;
  eyebrow: string | null;
  body: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  displayOrder: number;
  isVisible: boolean;
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
  generalInfo: string | null;
  isVisible: boolean;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string | null;
  address: string;
  responsibleName: string;
  responsibleContact: string;
  isActive: boolean;
}

interface Guardian {
  id: string;
  firstName: string;
  lastName: string | null;
  dni: string | null;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  notes: string | null;
  isActive: boolean;
}

interface Booking {
  id: string;
  status: "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  selectedDate: string;
  startTime: string;
  endTime: string;
  totalTopics: number;
  totalAmount: string;
  paymentAlias: string | null;
  student: { firstName: string; lastName: string; dni: string };
}

interface Settings {
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
  whatsappNumber: string | null;
  siteTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string | null;
}

const tabs: { id: AdminTab; label: string }[] = [
  { id: "dashboard", label: "Panel" },
  { id: "downloadables", label: "Descargables" },
  { id: "subjects", label: "Materias" },
  { id: "subject-highlights", label: "Destacados" },
  { id: "topics", label: "Temarios" },
  { id: "booking-time-slots", label: "Horarios" },
  { id: "content-blocks", label: "Textos" },
  { id: "schools", label: "Colegios" },
  { id: "students", label: "Alumnos" },
  { id: "guardians", label: "Tutores" },
  { id: "bookings", label: "Reservas" },
  { id: "settings", label: "Configuración" },
  { id: "security", label: "Seguridad" },
];

function getTabFromHash(): AdminTab {
  const rawTab = window.location.hash.replace(/^#\/admin\/?/, "").split("?")[0];

  return tabs.some((item) => item.id === rawTab) ? (rawTab as AdminTab) : "dashboard";
}

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function textValue(form: FormData, key: string) {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
}

function boolValue(form: FormData, key: string) {
  return form.get(key) === "on";
}

export function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessionState, setSessionState] = useState<LoadState>("loading");
  const [tab, setTab] = useState<AdminTab>(() => getTabFromHash());

  useEffect(() => {
    api<{ user: AdminUser }>("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        setSessionState("ready");
      })
      .catch(() => {
        setSessionState("error");
      });
  }, []);

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);

    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  async function logout() {
    await api<void>("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setSessionState("error");
  }

  if (sessionState === "loading") {
    return <div className="admin-loading">Validando sesión...</div>;
  }

  if (!user) {
    return <LoginPanel onLogin={(nextUser) => { setUser(nextUser); setSessionState("ready"); }} />;
  }

  if (user.role === "USER") {
    return (
      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">Panel privado</p>
          <h1>Acceso de administrador requerido</h1>
          <p className="muted">Tu usuario está logueado, pero no tiene permisos para administrar aulaCiencias.</p>
          <a className="primary-action" href="#inicio">Volver al sitio</a>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="brand" href="#inicio">aulaCiencias</a>
        <p>{user.email}</p>
        <nav className="admin-nav" aria-label="Panel de administración">
          {tabs.map((item) => (
            <button
              className={tab === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                window.location.hash = item.id === "dashboard" ? "#/admin" : `#/admin/${item.id}`;
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="secondary-action" type="button" onClick={logout}>Salir</button>
      </aside>
      <main className="admin-main">
        {tab === "dashboard" ? <Dashboard /> : null}
        {tab === "downloadables" ? <DownloadablesAdmin /> : null}
        {tab === "subjects" ? <SubjectsAdmin /> : null}
        {tab === "subject-highlights" ? <SubjectHighlightsAdmin /> : null}
        {tab === "topics" ? <TopicsAdmin /> : null}
        {tab === "booking-time-slots" ? <BookingTimeSlotsAdmin /> : null}
        {tab === "content-blocks" ? <ContentBlocksAdmin /> : null}
        {tab === "schools" ? <SchoolsAdmin /> : null}
        {tab === "students" ? <StudentsAdmin /> : null}
        {tab === "guardians" ? <GuardiansAdmin /> : null}
        {tab === "bookings" ? <BookingsAdmin /> : null}
        {tab === "settings" ? <SettingsAdmin /> : null}
        {tab === "security" ? <SecurityAdmin /> : null}
      </main>
    </div>
  );
}

function LoginPanel({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const data = await api<{ user: AdminUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      onLogin(data.user);
    } catch {
      setMessage("Correo electrónico o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">Panel privado</p>
        <h1>Ingresar a administración</h1>
        <label>Correo electrónico<input name="email" type="email" required /></label>
        <label>Contraseña<input name="password" type="password" required /></label>
        <button className="primary-action button-action" type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
        {message ? <p className="error-text">{message}</p> : null}
      </form>
    </main>
  );
}

function Dashboard() {
  return (
    <section className="admin-section">
      <h1>Panel</h1>
      <div className="admin-grid">
        <div className="metric-card"><strong>Contenido</strong><span>Gestiona materiales descargables.</span></div>
        <div className="metric-card"><strong>Reservas</strong><span>Revisa pagos y estados manuales.</span></div>
        <div className="metric-card"><strong>Configuración</strong><span>Ajusta precios, cupos y colores.</span></div>
      </div>
    </section>
  );
}

function DownloadablesAdmin() {
  const [items, setItems] = useState<Downloadable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Downloadable | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [downloadables, cats] = await Promise.all([
      api<{ items: Downloadable[] }>("/api/admin/downloadables?limit=50"),
      api<{ items: Category[] }>("/api/admin/downloadable-categories"),
    ]);
    setItems(downloadables.items);
    setCategories(cats.items);
  }

  useEffect(() => { load().catch(() => setMessage("No se pudo cargar contenido.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      description: textValue(form, "description"),
      imageUrl: textValue(form, "imageUrl"),
      categoryId: String(form.get("categoryId") ?? ""),
      isFeatured: boolValue(form, "isFeatured"),
      isVisible: boolValue(form, "isVisible"),
    };
    const url = editing ? `/api/admin/downloadables/${editing.id}` : "/api/admin/downloadables";
    await api(url, { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api(
      editingCategory
        ? `/api/admin/downloadable-categories/${editingCategory.id}`
        : "/api/admin/downloadable-categories",
      {
        method: editingCategory ? "PATCH" : "POST",
        body: JSON.stringify({ name: textValue(form, "name"), slug: textValue(form, "slug") }),
      },
    );
    setEditingCategory(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Contenido descargable" message={message}>
      <form className="admin-form" key={editingCategory?.id ?? "new-category"} onSubmit={createCategory}>
        <h3>{editingCategory ? "Editar categoría" : "Nueva categoría"}</h3>
        <label>Nombre<input name="name" required defaultValue={editingCategory?.name} /></label>
        <label>Slug<input name="slug" required placeholder="material-de-clase" defaultValue={editingCategory?.slug} /></label>
        <button className="secondary-action" type="submit">Guardar categoría</button>
        {editingCategory ? (
          <button className="secondary-action" type="button" onClick={() => setEditingCategory(null)}>
            Cancelar
          </button>
        ) : null}
      </form>
      <div className="admin-list">
        {categories.map((category) => (
          <article className="admin-row" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <span>{category.slug}</span>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => setEditingCategory(category)}>Editar categoría</button>
            </div>
          </article>
        ))}
      </div>
      <form className="admin-form" key={editing?.id ?? "new-downloadable"} onSubmit={submit}>
        <h3>{editing ? "Editar descargable" : "Nuevo descargable"}</h3>
        <label>Título<input name="title" required defaultValue={editing?.title} /></label>
        <label>Categoria<select name="categoryId" required defaultValue={editing?.categoryId || ""}>
          <option value="">Seleccionar</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select></label>
        <label>URL de imagen<input name="imageUrl" type="url" defaultValue={editing?.imageUrl || ""} /></label>
        <label className="full-field">Descripcion<textarea name="description" defaultValue={editing?.description || ""} /></label>
        <label className="inline-check"><input name="isFeatured" type="checkbox" defaultChecked={editing?.isFeatured} /> Destacado</label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/downloadables/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function SubjectsAdmin() {
  const [items, setItems] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Subject | null>(null);

  async function load() {
    setItems((await api<{ items: Subject[] }>("/api/admin/subjects?limit=100")).items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      description: textValue(form, "description"),
      displayOrder: Number(form.get("displayOrder") || 0),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/subjects/${editing.id}` : "/api/admin/subjects", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Materias">
      <form className="admin-form" key={editing?.id ?? "new-subject"} onSubmit={submit}>
        <h3>{editing ? "Editar materia" : "Nueva materia"}</h3>
        <label>Nombre<input name="name" required defaultValue={editing?.name} /></label>
        <label>Slug<input name="slug" required defaultValue={editing?.slug} /></label>
        <label>Orden<input name="displayOrder" type="number" min="0" defaultValue={editing?.displayOrder ?? 0} /></label>
        <label className="full-field">Descripcion<textarea name="description" defaultValue={editing?.description || ""} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/subjects/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function SubjectHighlightsAdmin() {
  const [items, setItems] = useState<SubjectHighlight[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<SubjectHighlight | null>(null);

  async function load() {
    const [highlights, subjectList] = await Promise.all([
      api<{ items: SubjectHighlight[] }>("/api/admin/subject-highlights?limit=100"),
      api<{ items: Subject[] }>("/api/admin/subjects?limit=100"),
    ]);
    setItems(highlights.items);
    setSubjects(subjectList.items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      subjectId: textValue(form, "subjectId"),
      title: String(form.get("title") ?? "").trim(),
      slug: String(form.get("slug") ?? "").trim(),
      keywords: textValue(form, "keywords"),
      definition: String(form.get("definition") ?? "").trim(),
      professions: textValue(form, "professions"),
      jobs: textValue(form, "jobs"),
      imageUrl: String(form.get("imageUrl") ?? "").trim(),
      displayOrder: Number(form.get("displayOrder") || 0),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/subject-highlights/${editing.id}` : "/api/admin/subject-highlights", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Destacados del conocimiento">
      <form className="admin-form" key={editing?.id ?? "new-highlight"} onSubmit={submit}>
        <h3>{editing ? "Editar destacado" : "Nuevo destacado"}</h3>
        <label>Título<input name="title" required defaultValue={editing?.title} /></label>
        <label>Slug<input name="slug" required defaultValue={editing?.slug} /></label>
        <label>Materia<select name="subjectId" defaultValue={editing?.subjectId || ""}>
          <option value="">Sin materia</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select></label>
        <label>Orden<input name="displayOrder" type="number" min="0" defaultValue={editing?.displayOrder ?? 0} /></label>
        <label className="full-field">URL de imagen<input name="imageUrl" type="url" required defaultValue={editing?.imageUrl || ""} /></label>
        <label className="full-field">Definición<textarea name="definition" required defaultValue={editing?.definition || ""} /></label>
        <label className="full-field">Palabras clave<textarea name="keywords" defaultValue={editing?.keywords || ""} /></label>
        <label className="full-field">Profesiones<textarea name="professions" defaultValue={editing?.professions || ""} /></label>
        <label className="full-field">Trabajos<textarea name="jobs" defaultValue={editing?.jobs || ""} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/subject-highlights/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function TopicsAdmin() {
  const [items, setItems] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Topic | null>(null);

  async function load() {
    const [topicList, subjectList] = await Promise.all([
      api<{ items: Topic[] }>("/api/admin/topics?limit=50"),
      api<{ items: Subject[] }>("/api/admin/subjects?limit=100"),
    ]);
    setItems(topicList.items);
    setSubjects(subjectList.items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      introduction: textValue(form, "introduction"),
      importance: textValue(form, "importance"),
      subjectId: textValue(form, "subjectId"),
      subject: subjects.find((subject) => subject.id === textValue(form, "subjectId"))?.name ?? textValue(form, "subject"),
      educationLevel: textValue(form, "educationLevel"),
      educationTrack: textValue(form, "educationTrack"),
      schoolYear: textValue(form, "schoolYear"),
      relatedCareers: textValue(form, "relatedCareers"),
      estimatedMinutes: Number(form.get("estimatedMinutes") || 60),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/topics/${editing.id}` : "/api/admin/topics", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Temarios">
      <form className="admin-form" key={editing?.id ?? "new-topic"} onSubmit={submit}>
        <h3>{editing ? "Editar temario" : "Nuevo temario"}</h3>
        <label>Título<input name="title" required defaultValue={editing?.title} /></label>
        <label>Materia<select name="subjectId" defaultValue={editing?.subjectId || ""}>
          <option value="">Sin materia</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select></label>
        <input name="subject" type="hidden" defaultValue={editing?.subject || ""} />
        <label>Nivel<input name="educationLevel" placeholder="Primaria, Secundaria" defaultValue={editing?.educationLevel || ""} /></label>
        <label>Modalidad<input name="educationTrack" placeholder="Primaria, Bachiller, Tecnico" defaultValue={editing?.educationTrack || ""} /></label>
        <label>Año/grado<input name="schoolYear" placeholder="1° año, 6° grado" defaultValue={editing?.schoolYear || ""} /></label>
        <label>Minutos estimados<input name="estimatedMinutes" type="number" min="1" required defaultValue={editing?.estimatedMinutes || 60} /></label>
        <label className="full-field">Introduccion<textarea name="introduction" defaultValue={editing?.introduction || ""} /></label>
        <label className="full-field">Importancia<textarea name="importance" defaultValue={editing?.importance || ""} /></label>
        <label className="full-field">Profesiones relacionadas<textarea name="relatedCareers" defaultValue={editing?.relatedCareers || ""} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/topics/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function SchoolsAdmin() {
  const [items, setItems] = useState<School[]>([]);
  const [editing, setEditing] = useState<School | null>(null);

  async function load() {
    setItems((await api<{ items: School[] }>("/api/admin/schools?limit=50")).items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      level: textValue(form, "level"),
      managementType: textValue(form, "managementType"),
      address: textValue(form, "address"),
      phone: textValue(form, "phone"),
      email: textValue(form, "email"),
      latitude: textValue(form, "latitude"),
      longitude: textValue(form, "longitude"),
      mapUrl: textValue(form, "mapUrl"),
      generalInfo: textValue(form, "generalInfo"),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/schools/${editing.id}` : "/api/admin/schools", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Colegios">
      <form className="admin-form" key={editing?.id ?? "new-school"} onSubmit={submit}>
        <h3>{editing ? "Editar colegio" : "Nuevo colegio"}</h3>
        <label>Nombre<input name="name" required defaultValue={editing?.name} /></label>
        <label>Nivel<input name="level" defaultValue={editing?.level || ""} /></label>
        <label>Gestion<input name="managementType" defaultValue={editing?.managementType || ""} /></label>
        <label>Teléfono<input name="phone" defaultValue={editing?.phone || ""} /></label>
        <label>Correo electrónico<input name="email" type="email" defaultValue={editing?.email || ""} /></label>
        <label>Mapa<input name="mapUrl" type="url" defaultValue={editing?.mapUrl || ""} /></label>
        <label>Latitud<input name="latitude" defaultValue={editing?.latitude || ""} /></label>
        <label>Longitud<input name="longitude" defaultValue={editing?.longitude || ""} /></label>
        <label className="full-field">Dirección<input name="address" defaultValue={editing?.address || ""} /></label>
        <label className="full-field">Informacion<textarea name="generalInfo" defaultValue={editing?.generalInfo || ""} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/schools/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function BookingTimeSlotsAdmin() {
  const [items, setItems] = useState<BookingTimeSlot[]>([]);
  const [editing, setEditing] = useState<BookingTimeSlot | null>(null);

  async function load() {
    setItems((await api<{ items: BookingTimeSlot[] }>("/api/admin/booking-time-slots?limit=100")).items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      startTime: String(form.get("startTime") ?? "").trim(),
      label: String(form.get("label") ?? "").trim(),
      displayOrder: Number(form.get("displayOrder") || 0),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/booking-time-slots/${editing.id}` : "/api/admin/booking-time-slots", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Horarios de reserva">
      <form className="admin-form" key={editing?.id ?? "new-slot"} onSubmit={submit}>
        <h3>{editing ? "Editar horario" : "Nuevo horario"}</h3>
        <label>Hora<input name="startTime" type="time" required defaultValue={editing?.startTime || ""} /></label>
        <label>Etiqueta<input name="label" required defaultValue={editing?.label || ""} /></label>
        <label>Orden<input name="displayOrder" type="number" min="0" defaultValue={editing?.displayOrder ?? 0} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/booking-time-slots/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function ContentBlocksAdmin() {
  const [items, setItems] = useState<ContentBlock[]>([]);
  const [editing, setEditing] = useState<ContentBlock | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setItems((await api<{ items: ContentBlock[] }>("/api/admin/content-blocks?limit=100")).items);
  }
  useEffect(() => { load().catch(() => setMessage("No se pudieron cargar textos.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawMetadata = String(form.get("metadata") || "").trim();
    let metadata: Record<string, unknown> | null = null;

    if (rawMetadata) {
      try {
        metadata = JSON.parse(rawMetadata) as Record<string, unknown>;
      } catch {
        setMessage("Los metadatos deben ser JSON válido.");
        return;
      }
    }

    const payload = {
      key: String(form.get("key") ?? "").trim(),
      title: textValue(form, "title"),
      eyebrow: textValue(form, "eyebrow"),
      body: textValue(form, "body"),
      imageUrl: textValue(form, "imageUrl"),
      metadata,
      displayOrder: Number(form.get("displayOrder") || 0),
      isVisible: boolValue(form, "isVisible"),
    };
    await api(editing ? `/api/admin/content-blocks/${editing.id}` : "/api/admin/content-blocks", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    setMessage("");
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Textos editables" message={message}>
      <form className="admin-form" key={editing?.id ?? "new-content"} onSubmit={submit}>
        <h3>{editing ? "Editar bloque" : "Nuevo bloque"}</h3>
        <label>Clave<input name="key" required defaultValue={editing?.key} /></label>
        <label>Orden<input name="displayOrder" type="number" min="0" defaultValue={editing?.displayOrder ?? 0} /></label>
        <label>Texto superior<input name="eyebrow" defaultValue={editing?.eyebrow || ""} /></label>
        <label>Título<input name="title" defaultValue={editing?.title || ""} /></label>
        <label className="full-field">Imagen<input name="imageUrl" type="url" defaultValue={editing?.imageUrl || ""} /></label>
        <label className="full-field">Cuerpo<textarea name="body" defaultValue={editing?.body || ""} /></label>
        <label className="full-field">Metadatos JSON<textarea name="metadata" defaultValue={editing?.metadata ? JSON.stringify(editing.metadata, null, 2) : ""} /></label>
        <label className="inline-check"><input name="isVisible" type="checkbox" defaultChecked={editing?.isVisible ?? true} /> Visible</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/content-blocks/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function GuardiansAdmin() {
  const [items, setItems] = useState<Guardian[]>([]);
  const [editing, setEditing] = useState<Guardian | null>(null);

  async function load() {
    setItems((await api<{ items: Guardian[] }>("/api/admin/guardians?limit=100")).items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: textValue(form, "lastName"),
      dni: textValue(form, "dni"),
      phone: textValue(form, "phone"),
      email: textValue(form, "email"),
      relationship: textValue(form, "relationship"),
      notes: textValue(form, "notes"),
      isActive: boolValue(form, "isActive"),
    };
    await api(editing ? `/api/admin/guardians/${editing.id}` : "/api/admin/guardians", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Tutores">
      <form className="admin-form" key={editing?.id ?? "new-guardian"} onSubmit={submit}>
        <h3>{editing ? "Editar tutor" : "Nuevo tutor"}</h3>
        <label>Nombre<input name="firstName" required defaultValue={editing?.firstName} /></label>
        <label>Apellido<input name="lastName" defaultValue={editing?.lastName || ""} /></label>
        <label>DNI<input name="dni" defaultValue={editing?.dni || ""} /></label>
        <label>Teléfono<input name="phone" defaultValue={editing?.phone || ""} /></label>
        <label>Correo electrónico<input name="email" type="email" defaultValue={editing?.email || ""} /></label>
        <label>Relacion<input name="relationship" defaultValue={editing?.relationship || ""} /></label>
        <label className="full-field">Notas<textarea name="notes" defaultValue={editing?.notes || ""} /></label>
        <label className="inline-check"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /> Activo</label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/guardians/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function StudentsAdmin() {
  const [items, setItems] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [editing, setEditing] = useState<Student | null>(null);

  async function load() {
    const [studentList, guardianList] = await Promise.all([
      api<{ items: Student[] }>("/api/admin/students?limit=100"),
      api<{ items: Guardian[] }>("/api/admin/guardians?limit=100"),
    ]);
    setItems(studentList.items);
    setGuardians(guardianList.items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const guardianIds = form.getAll("guardianIds").map((value) => String(value));
    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      dni: String(form.get("dni") ?? "").trim(),
      phone: textValue(form, "phone"),
      address: String(form.get("address") ?? "").trim(),
      responsibleName: String(form.get("responsibleName") ?? "").trim(),
      responsibleContact: String(form.get("responsibleContact") ?? "").trim(),
      isActive: boolValue(form, "isActive"),
      guardianIds,
    };
    await api(editing ? `/api/admin/students/${editing.id}` : "/api/admin/students", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    event.currentTarget.reset();
    await load();
  }

  return (
    <CrudShell title="Alumnos">
      <form className="admin-form" key={editing?.id ?? "new-student"} onSubmit={submit}>
        <h3>{editing ? "Editar alumno" : "Nuevo alumno"}</h3>
        <label>Nombre<input name="firstName" required defaultValue={editing?.firstName} /></label>
        <label>Apellido<input name="lastName" required defaultValue={editing?.lastName} /></label>
        <label>DNI<input name="dni" required defaultValue={editing?.dni} /></label>
        <label>Teléfono<input name="phone" defaultValue={editing?.phone || ""} /></label>
        <label className="full-field">Dirección<input name="address" required defaultValue={editing?.address || ""} /></label>
        <label>Responsable legacy<input name="responsibleName" required defaultValue={editing?.responsibleName || ""} /></label>
        <label>Contacto legacy<input name="responsibleContact" required defaultValue={editing?.responsibleContact || ""} /></label>
        <label className="inline-check"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /> Activo</label>
        <label className="full-field">Tutores
          <select name="guardianIds" multiple>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {[guardian.firstName, guardian.lastName, guardian.phone].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-action" type="submit">Guardar</button>
      </form>
      <AdminTable items={items} onEdit={setEditing} onHide={(id) => api(`/api/admin/students/${id}`, { method: "DELETE" }).then(load)} />
    </CrudShell>
  );
}

function BookingsAdmin() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<Booking[]>([]);
  const query = status ? `?status=${status}` : "";

  async function load() {
    setItems((await api<{ items: Booking[] }>(`/api/admin/bookings${query}`)).items);
  }
  useEffect(() => { load().catch(() => undefined); }, [query]);

  async function changeStatus(id: string, nextStatus: string) {
    await api(`/api/admin/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    await load();
  }

  return (
    <section className="admin-section">
      <h1>Reservas</h1>
      <div className="filters">
        <label>Estado<select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {["PENDING_PAYMENT", "PAID", "CONFIRMED", "CANCELLED", "COMPLETED"].map((item) => <option key={item}>{item}</option>)}
        </select></label>
      </div>
      <div className="admin-list">
        {items.map((booking) => (
          <article className="admin-row" key={booking.id}>
            <div>
              <strong>{booking.student.firstName} {booking.student.lastName}</strong>
              <span>{booking.selectedDate} · {booking.startTime}-{booking.endTime} · {booking.totalAmount}</span>
              <span>{booking.status}</span>
            </div>
            <div className="row-actions">
              {["PAID", "CONFIRMED", "CANCELLED", "COMPLETED"].map((nextStatus) => (
                <button key={nextStatus} type="button" onClick={() => changeStatus(booking.id, nextStatus)}>{nextStatus}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings").then((data) => setSettings(data.settings)).catch(() => setMessage("No se pudo cargar la configuración."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      pricePerHour: textValue(form, "pricePerHour"),
      topicsPerHour: Number(form.get("topicsPerHour") || 1),
      maxStudentsPerSlot: Number(form.get("maxStudentsPerSlot") || 1),
      mercadoPagoAlias: textValue(form, "mercadoPagoAlias"),
      primaryColor: String(form.get("primaryColor") || "#0f766e"),
      secondaryColor: String(form.get("secondaryColor") || "#1e293b"),
      accentColor: String(form.get("accentColor") || "#f59e0b"),
      heroImageUrl: textValue(form, "heroImageUrl"),
      backgroundImageUrl: textValue(form, "backgroundImageUrl"),
      faviconUrl: textValue(form, "faviconUrl"),
      carouselImages: textValue(form, "carouselImages"),
      subjectWindowIntervalSeconds: Number(form.get("subjectWindowIntervalSeconds") || 5),
      subjectWindowItems: null,
      whatsappNumber: textValue(form, "whatsappNumber"),
      siteTitle: String(form.get("siteTitle") || ""),
      heroEyebrow: String(form.get("heroEyebrow") || ""),
      heroTitle: String(form.get("heroTitle") || ""),
      heroSubtitle: String(form.get("heroSubtitle") || ""),
    };
    setSettings((await api<{ settings: Settings }>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(payload) })).settings);
    setMessage("Configuración guardada.");
  }

  return (
    <section className="admin-section">
      <h1>Configuración</h1>
      {settings ? (
        <form className="admin-form" onSubmit={submit}>
          <h3>Reservas</h3>
          <label>Precio por hora<input name="pricePerHour" required defaultValue={settings.pricePerHour} /></label>
          <label>Temas por hora<input name="topicsPerHour" type="number" min="1" required defaultValue={settings.topicsPerHour} /></label>
          <label>Alumnos por horario<input name="maxStudentsPerSlot" type="number" min="1" required defaultValue={settings.maxStudentsPerSlot} /></label>
          <label>Alias Mercado Pago<input name="mercadoPagoAlias" defaultValue={settings.mercadoPagoAlias || ""} /></label>

          <h3>Colores</h3>
          <label>Color primario<input name="primaryColor" type="color" defaultValue={settings.primaryColor} /></label>
          <label>Color secundario<input name="secondaryColor" type="color" defaultValue={settings.secondaryColor} /></label>
          <label>Color acento<input name="accentColor" type="color" defaultValue={settings.accentColor} /></label>

          <h3>Portada</h3>
          <label>Foto de portada<input name="heroImageUrl" type="url" defaultValue={settings.heroImageUrl || ""} /></label>
          <label>Título del sitio<input name="siteTitle" required defaultValue={settings.siteTitle} /></label>
          <label>Texto superior de la portada<input name="heroEyebrow" required defaultValue={settings.heroEyebrow} /></label>
          <label className="full-field">Título principal de la portada<input name="heroTitle" required defaultValue={settings.heroTitle} /></label>
          <label className="full-field">Texto de portada<textarea name="heroSubtitle" defaultValue={settings.heroSubtitle || ""} /></label>

          <h3>Imágenes y ventanas</h3>
          <label>Imagen de fondo<input name="backgroundImageUrl" type="url" defaultValue={settings.backgroundImageUrl || ""} /></label>
          <label>Favicon<input name="faviconUrl" type="url" defaultValue={settings.faviconUrl || ""} /></label>
          <label>Velocidad de ventanas (1 lenta, 50 rápida)<input name="subjectWindowIntervalSeconds" type="number" min="1" max="50" required defaultValue={settings.subjectWindowIntervalSeconds || 5} /></label>
          <label>WhatsApp<input name="whatsappNumber" defaultValue={settings.whatsappNumber || ""} /></label>
          <label className="full-field">Fotos del carrusel<textarea name="carouselImages" placeholder="Una URL por línea" defaultValue={settings.carouselImages || ""} /></label>
          <button className="primary-action" type="submit">Guardar configuración</button>
        </form>
      ) : <p className="muted">Cargando...</p>}
      {message ? <p className="ok-text">{message}</p> : null}
    </section>
  );
}

function SecurityAdmin() {
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");

    if (newPassword.length < 8) {
      setMessage("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    await api("/api/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: String(form.get("currentPassword") || ""),
        newPassword,
      }),
    });
    event.currentTarget.reset();
    setMessage("Contraseña actualizada.");
  }

  return (
    <section className="admin-section">
      <h1>Seguridad</h1>
      <form className="admin-form" onSubmit={submit}>
        <label>Contraseña actual<input name="currentPassword" type="password" required /></label>
        <label>Nueva contraseña<input name="newPassword" type="password" minLength={8} required /></label>
        <button className="primary-action" type="submit">Cambiar contraseña</button>
      </form>
      {message ? <p className="ok-text">{message}</p> : null}
    </section>
  );
}

function CrudShell({ title, message, children }: { title: string; message?: string; children: ReactNode }) {
  return (
    <section className="admin-section">
      <h1>{title}</h1>
      {message ? <p className="error-text">{message}</p> : null}
      {children}
    </section>
  );
}

function AdminTable<
  T extends {
    id: string;
    title?: string | null;
    name?: string | null;
    label?: string | null;
    key?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isVisible?: boolean;
    isActive?: boolean;
  },
>({
  items,
  onEdit,
  onHide,
}: {
  items: T[];
  onEdit: (item: T) => void;
  onHide: (id: string) => Promise<unknown>;
}) {
  return (
    <div className="admin-list">
      {items.map((item) => (
        <article className="admin-row" key={item.id}>
          <div>
            <strong>{item.title || item.name || item.label || item.key || [item.firstName, item.lastName].filter(Boolean).join(" ")}</strong>
            <span>{item.isVisible === false || item.isActive === false ? "Oculto" : "Visible"}</span>
          </div>
          <div className="row-actions">
            <button type="button" onClick={() => onEdit(item)}>Editar</button>
            <button type="button" onClick={() => onHide(item.id)}>Ocultar</button>
          </div>
        </article>
      ))}
    </div>
  );
}
