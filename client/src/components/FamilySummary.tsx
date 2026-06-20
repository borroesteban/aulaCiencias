import { useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "error";

interface FamilySummaryData {
  studentName: string;
  currentWork: string;
  needsReinforcement: string;
  generalStatus: string;
  nextClass: null | {
    selectedDate: string;
    startTime: string;
    endTime: string;
    topics: Array<{ title: string }>;
  };
  visibleTeacherNotes: Array<{ id: string; subject: string | null; note: string; createdAt: string }>;
  updatedAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export function FamilySummary({ studentId }: { studentId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<FamilySummaryData | null>(null);

  useEffect(() => {
    let isMounted = true;
    setState("loading");

    fetch(`/api/students/${encodeURIComponent(studentId)}/family-summary`)
      .then((response) => {
        if (!response.ok) throw new Error("LOAD_ERROR");
        return response.json() as Promise<FamilySummaryData>;
      })
      .then((data) => {
        if (!isMounted) return;
        setSummary(data);
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
    return <section className="section"><p className="muted">Cargando resumen familiar...</p></section>;
  }

  if (state === "error" || !summary) {
    return (
      <section className="section family-page">
        <h1>Vista para familia</h1>
        <p className="error-text">No pudimos cargar el resumen de este alumno.</p>
      </section>
    );
  }

  return (
    <section className="section family-page">
      <div className="section-heading">
        <p className="eyebrow">Notas del docente</p>
        <h1>{summary.studentName}</h1>
        <p className="muted">Última actualización: {new Date(summary.updatedAt).toLocaleDateString("es-AR")}</p>
      </div>

      <div className="family-summary-layout">
        <section className="family-summary-main">
          <h2>Qué estamos trabajando</h2>
          <p>{summary.currentWork}</p>
          <h2>Qué falta reforzar</h2>
          <p>{summary.needsReinforcement}</p>
          <h2>Cómo viene</h2>
          <p>{summary.generalStatus}</p>
        </section>

        <aside className="family-summary-side">
          <h2>Próxima clase</h2>
          {summary.nextClass ? (
            <p>
              {formatDate(summary.nextClass.selectedDate)} · {summary.nextClass.startTime} a {summary.nextClass.endTime}
              <br />
              <span>{summary.nextClass.topics.map((topic) => topic.title).join(", ") || "Tema a definir"}</span>
            </p>
          ) : (
            <p className="muted">Sin próxima clase confirmada.</p>
          )}
          <h2>Observaciones visibles</h2>
          {summary.visibleTeacherNotes.length ? (
            <div className="tracking-list">
              {summary.visibleTeacherNotes.map((note) => (
                <article className="tracking-row" key={note.id}>
                  <strong>{note.subject || "General"}</strong>
                  <p>{note.note}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Sin observaciones visibles para familia.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
