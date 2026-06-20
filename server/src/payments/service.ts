import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { createGoogleCalendarBookingEvent } from "../calendar/googleCalendar.js";
import type * as schema from "../db/schema.js";
import { bookingPayments, bookingTopics, bookings, students, topics } from "../db/schema.js";
import { timeForResponse } from "../bookings/service.js";
import {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  type MercadoPagoPaymentResult,
} from "./mercadopago.js";

type Db = NodePgDatabase<typeof schema>;

const paymentHoldMinutes = 15;
const approvedStatuses = new Set(["approved", "accredited"]);
const pendingStatuses = new Set(["pending", "in_process", "authorized"]);
const failedStatuses = new Set(["rejected", "cancelled", "canceled"]);
const returnedStatuses = new Set(["refunded", "charged_back"]);

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateDepositAmount(totalAmount: string | number) {
  const total = toNumber(totalAmount);
  const deposit = total > 0 ? total * 0.3 : 0;
  return deposit.toFixed(2);
}

export function createPaymentHoldExpiration() {
  return new Date(Date.now() + paymentHoldMinutes * 60 * 1000);
}

function mapMercadoPagoStatus(status: string) {
  if (approvedStatuses.has(status)) {
    return { estadoPago: "aprobado", estadoReserva: "confirmada", bookingStatus: "CONFIRMED" as const };
  }

  if (pendingStatuses.has(status)) {
    return { estadoPago: "pendiente", estadoReserva: "pendiente_pago", bookingStatus: "PENDING_PAYMENT" as const };
  }

  if (returnedStatuses.has(status)) {
    return { estadoPago: "devuelto", estadoReserva: "cancelada", bookingStatus: "CANCELLED" as const };
  }

  if (failedStatuses.has(status)) {
    return { estadoPago: "rechazado", estadoReserva: "cancelada", bookingStatus: "CANCELLED" as const };
  }

  return { estadoPago: "fallido", estadoReserva: "cancelada", bookingStatus: "CANCELLED" as const };
}

async function getBatchBookings(db: Db, bookingBatchId: string) {
  const rows = await db
    .select({
      id: bookings.id,
      bookingBatchId: bookings.bookingBatchId,
      status: bookings.status,
      estadoReserva: bookings.estadoReserva,
      estadoPago: bookings.estadoPago,
      selectedDate: bookings.selectedDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      totalAmount: bookings.totalAmount,
      paymentAlias: bookings.paymentAlias,
      mercadopagoPreferenceId: bookings.mercadopagoPreferenceId,
      mercadopagoPaymentId: bookings.mercadopagoPaymentId,
      googleCalendarEventId: bookings.googleCalendarEventId,
      montoSenia: bookings.montoSenia,
      paidAt: bookings.paidAt,
      expiresAt: bookings.expiresAt,
      adminNotes: bookings.adminNotes,
      objetivos: bookings.objetivos,
      modalidad: bookings.modalidad,
      tipoClase: bookings.tipoClase,
      packSeleccionado: bookings.packSeleccionado,
      studentId: students.id,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentPhone: students.phone,
      responsibleContact: students.responsibleContact,
      topicId: topics.id,
      topicTitle: topics.title,
      topicSubject: topics.subject,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .leftJoin(bookingTopics, eq(bookingTopics.bookingId, bookings.id))
    .leftJoin(topics, eq(bookingTopics.topicId, topics.id))
    .where(eq(bookings.bookingBatchId, bookingBatchId));

  const grouped = new Map<
    string,
    {
      id: string;
      bookingBatchId: string | null;
      status: string;
      estadoReserva: string;
      estadoPago: string;
      selectedDate: string;
      startTime: string;
      endTime: string;
      totalAmount: string;
      paymentAlias: string | null;
      mercadopagoPreferenceId: string | null;
      mercadopagoPaymentId: string | null;
      googleCalendarEventId: string | null;
      montoSenia: string | null;
      paidAt: Date | null;
      expiresAt: Date | null;
      adminNotes: string | null;
      objetivos: string[];
      modalidad: string;
      tipoClase: string;
      packSeleccionado: string | null;
      student: { id: string; name: string; phone: string | null; responsibleContact: string };
      topics: Array<{ id: string; title: string; subject: string | null }>;
    }
  >();

  for (const row of rows) {
    const existing =
      grouped.get(row.id) ??
      {
        id: row.id,
        bookingBatchId: row.bookingBatchId,
        status: row.status,
        estadoReserva: row.estadoReserva,
        estadoPago: row.estadoPago,
        selectedDate: row.selectedDate,
        startTime: timeForResponse(row.startTime),
        endTime: timeForResponse(row.endTime),
        totalAmount: row.totalAmount,
        paymentAlias: row.paymentAlias,
        mercadopagoPreferenceId: row.mercadopagoPreferenceId,
        mercadopagoPaymentId: row.mercadopagoPaymentId,
        googleCalendarEventId: row.googleCalendarEventId,
        montoSenia: row.montoSenia,
        paidAt: row.paidAt,
        expiresAt: row.expiresAt,
        adminNotes: row.adminNotes,
        objetivos: row.objetivos,
        modalidad: row.modalidad,
        tipoClase: row.tipoClase,
        packSeleccionado: row.packSeleccionado,
        student: {
          id: row.studentId,
          name: `${row.studentFirstName} ${row.studentLastName}`.trim(),
          phone: row.studentPhone,
          responsibleContact: row.responsibleContact,
        },
        topics: [],
      };

    if (row.topicId && row.topicTitle) {
      existing.topics.push({
        id: row.topicId,
        title: row.topicTitle,
        subject: row.topicSubject,
      });
    }

    grouped.set(row.id, existing);
  }

  return Array.from(grouped.values());
}

async function recordPayment(db: Db, payment: MercadoPagoPaymentResult, bookingBatchId: string, rawPayload: Record<string, unknown>) {
  const [existing] = await db
    .select({ id: bookingPayments.id })
    .from(bookingPayments)
    .where(eq(bookingPayments.paymentId, payment.id))
    .limit(1);

  const values = {
    bookingBatchId,
    status: payment.status,
    provider: "mercadopago",
    paymentId: payment.id,
    externalReference: payment.externalReference ?? bookingBatchId,
    amount: payment.amount === null ? null : payment.amount.toFixed(2),
    rawPayload: rawPayload,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(bookingPayments).set(values).where(eq(bookingPayments.id, existing.id));
    return;
  }

  await db.insert(bookingPayments).values(values);
}

async function createCalendarEventsForApprovedBookings(db: Db, bookingBatchId: string) {
  const batchBookings = await getBatchBookings(db, bookingBatchId);

  for (const booking of batchBookings) {
    if (booking.googleCalendarEventId) {
      continue;
    }

    try {
      const subject = booking.topics.find((topic) => topic.subject)?.subject ?? "Clase particular";
      const googleEventId = await createGoogleCalendarBookingEvent({
        bookingId: booking.id,
        bookingBatchId: booking.bookingBatchId,
        studentName: booking.student.name,
        contact: booking.student.phone ?? booking.student.responsibleContact,
        subject,
        topics: booking.topics.map((topic) => topic.title),
        selectedDate: booking.selectedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        objetivos: booking.objetivos,
        modalidad: booking.modalidad,
        tipoClase: booking.tipoClase,
        packSeleccionado: booking.packSeleccionado,
        estadoPago: "aprobado",
        adminNotes: booking.adminNotes,
      });

      if (googleEventId) {
        await db
          .update(bookings)
          .set({
            googleCalendarEventId: googleEventId,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, booking.id));
      }
    } catch (error) {
      console.error("No se pudo crear el evento de Google Calendar", {
        bookingId: booking.id,
        bookingBatchId,
        error,
      });
    }
  }
}

export async function createPaymentPreferenceForBatch(db: Db, bookingBatchId: string) {
  const batchBookings = await getBatchBookings(db, bookingBatchId);

  if (batchBookings.length === 0) {
    throw new Error("BOOKING_BATCH_NOT_FOUND");
  }

  const totalDeposit = batchBookings.reduce((total, booking) => {
    const deposit = booking.montoSenia ?? calculateDepositAmount(booking.totalAmount);
    return total + toNumber(deposit);
  }, 0);

  if (totalDeposit <= 0) {
    return {
      configured: false,
      preferenceId: null,
      initPoint: null,
      sandboxInitPoint: null,
      amount: "0.00",
      reason: "DEPOSIT_AMOUNT_NOT_CONFIGURED",
    };
  }

  const student = batchBookings[0].student;
  const preference = await createMercadoPagoPreference({
    bookingBatchId,
    title: `Seña Aula de Ciencias - ${student.name}`,
    amount: Number(totalDeposit.toFixed(2)),
    payer: {
      name: student.name,
    },
  });

  if (preference.id) {
    await db
      .update(bookings)
      .set({
        mercadopagoPreferenceId: preference.id,
        updatedAt: new Date(),
      })
      .where(eq(bookings.bookingBatchId, bookingBatchId));

    const [existingPayment] = await db
      .select({ id: bookingPayments.id })
      .from(bookingPayments)
      .where(and(eq(bookingPayments.bookingBatchId, bookingBatchId), eq(bookingPayments.preferenceId, preference.id)))
      .limit(1);

    if (!existingPayment) {
      await db.insert(bookingPayments).values({
        bookingBatchId,
        status: "pending",
        provider: "mercadopago",
        preferenceId: preference.id,
        externalReference: bookingBatchId,
        amount: totalDeposit.toFixed(2),
      });
    }
  }

  return {
    configured: preference.configured,
    preferenceId: preference.id,
    initPoint: preference.initPoint,
    sandboxInitPoint: preference.sandboxInitPoint,
    amount: totalDeposit.toFixed(2),
    reason: preference.configured ? null : "MERCADOPAGO_NOT_CONFIGURED",
  };
}

export async function confirmMercadoPagoPayment(
  db: Db,
  input: { paymentId: string; externalReference?: string | null; rawPayload?: Record<string, unknown> },
) {
  const payment = await getMercadoPagoPayment(input.paymentId);
  const bookingBatchId = payment.externalReference ?? input.externalReference;

  if (!bookingBatchId) {
    throw new Error("BOOKING_BATCH_NOT_FOUND");
  }

  const batchBookings = await getBatchBookings(db, bookingBatchId);

  if (batchBookings.length === 0) {
    throw new Error("BOOKING_BATCH_NOT_FOUND");
  }

  await recordPayment(db, payment, bookingBatchId, input.rawPayload ?? payment.raw);

  const mapped = mapMercadoPagoStatus(payment.status);
  const wasAlreadyApproved = batchBookings.every((booking) => booking.estadoPago === "aprobado");

  await db
    .update(bookings)
    .set({
      estadoPago: mapped.estadoPago,
      estadoReserva: mapped.estadoReserva,
      status: mapped.bookingStatus,
      mercadopagoPaymentId: payment.id,
      paidAt: mapped.estadoPago === "aprobado" ? new Date(payment.dateApproved ?? Date.now()) : null,
      updatedAt: new Date(),
    })
    .where(eq(bookings.bookingBatchId, bookingBatchId));

  if (mapped.estadoPago === "aprobado" && !wasAlreadyApproved) {
    await createCalendarEventsForApprovedBookings(db, bookingBatchId);
  }

  if (mapped.estadoPago === "aprobado" && wasAlreadyApproved) {
    await createCalendarEventsForApprovedBookings(db, bookingBatchId);
  }

  return getPaymentStatusForBatch(db, bookingBatchId);
}

export async function getPaymentStatusForBatch(db: Db, bookingBatchId: string) {
  const batchBookings = await getBatchBookings(db, bookingBatchId);

  if (batchBookings.length === 0) {
    throw new Error("BOOKING_BATCH_NOT_FOUND");
  }

  const [payment] = await db
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingBatchId, bookingBatchId))
    .limit(1);

  return {
    bookingBatchId,
    bookingCount: batchBookings.length,
    estadoReserva: batchBookings[0].estadoReserva,
    estadoPago: batchBookings[0].estadoPago,
    status: batchBookings[0].status,
    preferenceId: batchBookings[0].mercadopagoPreferenceId ?? payment?.preferenceId ?? null,
    paymentId: batchBookings[0].mercadopagoPaymentId ?? payment?.paymentId ?? null,
    googleCalendarEventIds: batchBookings
      .map((booking) => booking.googleCalendarEventId)
      .filter((eventId): eventId is string => Boolean(eventId)),
    amount: payment?.amount ?? batchBookings.reduce((total, booking) => total + toNumber(booking.montoSenia), 0).toFixed(2),
    bookings: batchBookings.map((booking) => ({
      id: booking.id,
      selectedDate: booking.selectedDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      estadoReserva: booking.estadoReserva,
      estadoPago: booking.estadoPago,
      googleCalendarEventId: booking.googleCalendarEventId,
    })),
  };
}
