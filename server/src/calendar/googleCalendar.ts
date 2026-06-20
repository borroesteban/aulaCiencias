import crypto from "node:crypto";

const calendarScope = "https://www.googleapis.com/auth/calendar";
const tokenUrl = "https://oauth2.googleapis.com/token";
const calendarApiBaseUrl = "https://www.googleapis.com/calendar/v3";
const argentinaTimeZone = "America/Argentina/Buenos_Aires";

export interface BookingCalendarEventInput {
  bookingId: string;
  bookingBatchId: string | null;
  studentName: string;
  contact: string | null;
  subject: string;
  topics: string[];
  selectedDate: string;
  startTime: string;
  endTime: string;
  objetivos: string[];
  modalidad: string;
  tipoClase: string;
  packSeleccionado: string | null;
  estadoPago: string;
  adminNotes: string | null;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && getPrivateKey() && getCalendarId());
}

function getCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID || process.env.GOOGLE_CALENDAR_NAME || "";
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: calendarScope,
      aud: tokenUrl,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${header}.${claim}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedToken).sign(privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GOOGLE_TOKEN_ERROR:${details}`);
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("GOOGLE_TOKEN_MISSING");
  }

  return data.access_token;
}

function slotDateTime(selectedDate: string, time: string) {
  return `${selectedDate}T${time}`;
}

function eventDescription(input: BookingCalendarEventInput) {
  return [
    `Alumno: ${input.studentName}`,
    `Contacto: ${input.contact ?? "-"}`,
    `Materia: ${input.subject}`,
    `Tema: ${input.topics.join(", ") || "-"}`,
    `Objetivos: ${input.objetivos.join(", ") || "-"}`,
    `Modalidad: ${input.modalidad}`,
    `Tipo de clase: ${input.tipoClase}`,
    `Pack: ${input.packSeleccionado ?? "-"}`,
    `Estado de pago: ${input.estadoPago}`,
    `ID reserva: ${input.bookingId}`,
    `Lote de reserva: ${input.bookingBatchId ?? "-"}`,
    `Observaciones: ${input.adminNotes ?? "-"}`,
    "",
    `Horario: ${input.selectedDate} ${input.startTime.slice(0, 5)}-${input.endTime.slice(0, 5)}`,
  ].join("\n");
}

export async function createGoogleCalendarBookingEvent(input: BookingCalendarEventInput) {
  const calendarId = getCalendarId();

  if (!isGoogleCalendarConfigured()) {
    return null;
  }

  const accessToken = await getGoogleAccessToken();
  const titleSubject = input.subject || "Clase";
  const response = await fetch(`${calendarApiBaseUrl}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      summary: `Clase Aula de Ciencias - ${titleSubject} - ${input.studentName}`,
      description: eventDescription(input),
      transparency: "opaque",
      start: {
        dateTime: slotDateTime(input.selectedDate, input.startTime),
        timeZone: argentinaTimeZone,
      },
      end: {
        dateTime: slotDateTime(input.selectedDate, input.endTime),
        timeZone: argentinaTimeZone,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GOOGLE_CALENDAR_EVENT_ERROR:${details}`);
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}
