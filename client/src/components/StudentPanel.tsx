import { useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "error";

interface StudentDashboard {
  student: { id: string; name: string; firstName: string; lastName: string };
  upcomingClasses: ClassItem[];
  classHistory: ClassItem[];
  subjectProgress: ProgressItem[];
  seenTopics: SeenTopic[];
  downloadedMaterials: DownloadEvent[];
  pendingExercises: PendingExercise[];
  teacherNotes: TeacherNote[];
}

interface ClassItem {
  id: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  modalidad: string;
  tipoClase: string;
  topics: Array<{ id: string; title: string; subject: string | null }>;
}

interface ProgressItem {
  id: string;
  subject: string;
  progressPercent: number;
  status: string | null;
  teacherNotes: string | null;
}

interface SeenTopic {
  id: string;
  subject: string;
  topic: string;
  seenAt: string;
}

interface DownloadEvent {
  id: string;
  title: string;
  downloadedAt: string;
}

interface PendingExercise {
  id: string;
  subject: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
}

interface TeacherNote {
  id: string;
  subject: string | null;
  note: string;
  visibleToFamily: boolean;
  createdAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function EmptyLine({ children }: { children: string }) {
  return <p className="muted">{children}</p>;
}

function ClassList({ items }: { items: ClassItem[] }) {
  if (!items.length) {
    return <EmptyLine>No hay clases para mostrar.</EmptyLine>;
  }

  return (
    <div className="tracking-list">
      {items.map((item) => (
        <article className="tracking-row" key={item.id}>
          <strong>{formatDate(item.selectedDate)} · {item.startTime} a {item.endTime}</strong>
          <span>{item.modalidad} · {item.tipoClase}</span>
          <small>{item.topics.map((topic) => topic.title).join(", ") || "Sin temas asociados"}</small>
        </article>
      ))}
    </div>
  );
}

export function StudentPanel({ studentId }: { studentId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);

  useEffect(() => {
    let isMounted = true;
    setState("loading");

    fetch(`/api/students/${encodeURIComponent(studentId)}/dashboard`)
      .then((response) => {
        if (!response.ok) throw new Error("LOAD_ERROR");
        return response.json() as Promise<StudentDashboard>;
      })
      .then((data) => {
        if (!isMounted) return;
        setDashboard(data);
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [studentId]);

  if (state === "loading") {
    return <section className="section"><p className="muted">Cargando seguimiento...</p></section>;
  }

  if (state === "error" || !dashboard) {
    return (
      <section className="section">
        <h1>Panel del alumno</h1>
        <p className="error-text">No pudimos cargar el seguimiento de este alumno.</p>
      </section>
    );
  }

  return (
    <section className="section tracking-page">
      <div className="section-heading">
        <p className="eyebrow">Panel del alumno</p>
        <h1>{dashboard.student.name}</h1>
      </div>

      <div className="tracking-grid">
        <section className="tracking-block wide">
          <h2>Próximas clases</h2>
          <ClassList items={dashboard.upcomingClasses} />
        </section>

        <section className="tracking-block">
          <h2>Progreso por materia</h2>
          {dashboard.subjectProgress.length ? (
            <div className="tracking-list">
              {dashboard.subjectProgress.map((item) => (
                <article className="tracking-row" key={item.id}>
                  <strong>{item.subject}</strong>
                  <div className="progress-bar"><span style={{ width: `${item.progressPercent}%` }} /></div>
                  <small>{item.progressPercent}% · {item.status || "En seguimiento"}</small>
                  {item.teacherNotes ? <p>{item.teacherNotes}</p> : null}
                </article>
              ))}
            </div>
          ) : <EmptyLine>Sin progreso cargado todavía.</EmptyLine>}
        </section>

        <section className="tracking-block">
          <h2>Temas vistos</h2>
          {dashboard.seenTopics.length ? (
            <div className="tracking-list">
              {dashboard.seenTopics.map((topic) => (
                <article className="tracking-row" key={topic.id}>
                  <strong>{topic.topic}</strong>
                  <span>{topic.subject}</span>
                  <small>{new Date(topic.seenAt).toLocaleDateString("es-AR")}</small>
                </article>
              ))}
            </div>
          ) : <EmptyLine>Sin temas vistos cargados.</EmptyLine>}
        </section>

        <section className="tracking-block">
          <h2>Materiales descargados</h2>
          {dashboard.downloadedMaterials.length ? (
            <div className="tracking-list">
              {dashboard.downloadedMaterials.map((material) => (
                <article className="tracking-row" key={material.id}>
                  <strong>{material.title}</strong>
                  <small>{new Date(material.downloadedAt).toLocaleDateString("es-AR")}</small>
                </article>
              ))}
            </div>
          ) : <EmptyLine>Sin descargas registradas.</EmptyLine>}
        </section>

        <section className="tracking-block">
          <h2>Ejercicios pendientes</h2>
          {dashboard.pendingExercises.length ? (
            <div className="tracking-list">
              {dashboard.pendingExercises.map((exercise) => (
                <article className="tracking-row" key={exercise.id}>
                  <strong>{exercise.title}</strong>
                  <span>{exercise.subject} · {exercise.status}</span>
                  {exercise.dueDate ? <small>Entrega: {new Date(exercise.dueDate).toLocaleDateString("es-AR")}</small> : null}
                  {exercise.description ? <p>{exercise.description}</p> : null}
                </article>
              ))}
            </div>
          ) : <EmptyLine>No hay ejercicios pendientes.</EmptyLine>}
        </section>

        <section className="tracking-block">
          <h2>Observaciones del docente</h2>
          {dashboard.teacherNotes.length ? (
            <div className="tracking-list">
              {dashboard.teacherNotes.map((note) => (
                <article className="tracking-row" key={note.id}>
                  <strong>{note.subject || "General"}</strong>
                  <p>{note.note}</p>
                  <small>{new Date(note.createdAt).toLocaleDateString("es-AR")}</small>
                </article>
              ))}
            </div>
          ) : <EmptyLine>Sin observaciones cargadas.</EmptyLine>}
        </section>

        <section className="tracking-block wide">
          <h2>Historial de clases</h2>
          <ClassList items={dashboard.classHistory} />
        </section>
      </div>
    </section>
  );
}
