import { useEffect, useMemo, useState } from "react";

type ResultKind = "success" | "pending" | "failure";
type LoadState = "idle" | "loading" | "ready" | "error";

interface PaymentStatus {
  bookingBatchId: string;
  bookingCount: number;
  estadoReserva: string;
  estadoPago: string;
  paymentId: string | null;
  googleCalendarEventIds: string[];
}

const copy = {
  success: {
    eyebrow: "Pago recibido",
    title: "Recibimos la confirmación del pago",
    body: "Tu reserva está siendo confirmada. Consultamos el estado real del sistema para cerrar el horario.",
  },
  pending: {
    eyebrow: "Pago pendiente",
    title: "Tu pago está pendiente",
    body: "Te avisaremos cuando se confirme. Mientras tanto, el horario puede quedar retenido temporalmente.",
  },
  failure: {
    eyebrow: "Pago no completado",
    title: "El pago no pudo completarse",
    body: "El horario no quedó reservado. Podés volver a intentar desde la reserva.",
  },
};

export function PaymentResultPage({ kind }: { kind: ResultKind }) {
  const [state, setState] = useState<LoadState>("idle");
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const bookingBatchId = params.get("external_reference") || params.get("bookingBatchId");

  useEffect(() => {
    if (!bookingBatchId) {
      return;
    }

    let isMounted = true;
    setState("loading");

    fetch(`/api/payments/mercadopago/status/${encodeURIComponent(bookingBatchId)}`)
      .then((response) => {
        if (!response.ok) throw new Error("STATUS_ERROR");
        return response.json() as Promise<PaymentStatus>;
      })
      .then((data) => {
        if (!isMounted) return;
        setStatus(data);
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [bookingBatchId]);

  const content = copy[kind];

  return (
    <section className="section payment-result-page">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      {bookingBatchId ? (
        <div className="payment-status-box">
          <strong>Lote de reserva</strong>
          <span>{bookingBatchId}</span>
          {state === "loading" ? <p className="muted">Consultando estado real...</p> : null}
          {state === "error" ? <p className="error-text">No pudimos consultar el estado todavía.</p> : null}
          {status ? (
            <p>
              Estado de reserva: <strong>{status.estadoReserva}</strong>. Estado de pago: <strong>{status.estadoPago}</strong>.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="muted">No llegó un identificador de lote en el retorno de pago.</p>
      )}
      <div className="hero-actions">
        <a className="primary-action" href="/#silvi">Volver a reservar</a>
        <a className="secondary-action" href="/">Inicio</a>
      </div>
    </section>
  );
}
