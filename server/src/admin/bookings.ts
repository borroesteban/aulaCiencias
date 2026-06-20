import { and, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { bookings, students } from "../db/schema.js";
import { idParamsSchema, listQuerySchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";
import { getBookingDetail, timeForResponse } from "../bookings/service.js";

const bookingStatuses = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

const bookingsQuerySchema = listQuerySchema.extend({
  status: z.enum(bookingStatuses).optional(),
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["PAID", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  adminNotes: z.string().trim().max(5000).optional().nullable(),
});

export const adminBookingsRouter = Router();

adminBookingsRouter.get("/", validateQuery(bookingsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, status, selectedDate } = req.query as unknown as z.infer<
      typeof bookingsQuerySchema
    >;
    const conditions = [];

    if (status) {
      conditions.push(eq(bookings.status, status));
    }

    if (selectedDate) {
      conditions.push(eq(bookings.selectedDate, selectedDate));
    }

    const items = await getDb()
      .select({
        id: bookings.id,
        status: bookings.status,
        bookingBatchId: bookings.bookingBatchId,
        estadoReserva: bookings.estadoReserva,
        estadoPago: bookings.estadoPago,
        selectedDate: bookings.selectedDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        totalTopics: bookings.totalTopics,
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
        usaPackPromocional: bookings.usaPackPromocional,
        packSeleccionado: bookings.packSeleccionado,
        horariosSeleccionados: bookings.horariosSeleccionados,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        studentDni: students.dni,
      })
      .from(bookings)
      .innerJoin(students, eq(bookings.studentId, students.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        bookingBatchId: item.bookingBatchId,
        estadoReserva: item.estadoReserva,
        estadoPago: item.estadoPago,
        selectedDate: item.selectedDate,
        startTime: timeForResponse(item.startTime),
        endTime: timeForResponse(item.endTime),
        totalTopics: item.totalTopics,
        totalAmount: item.totalAmount,
        paymentAlias: item.paymentAlias,
        mercadopagoPreferenceId: item.mercadopagoPreferenceId,
        mercadopagoPaymentId: item.mercadopagoPaymentId,
        googleCalendarEventId: item.googleCalendarEventId,
        montoSenia: item.montoSenia,
        paidAt: item.paidAt,
        expiresAt: item.expiresAt,
        adminNotes: item.adminNotes,
        objetivos: item.objetivos,
        modalidad: item.modalidad,
        tipoClase: item.tipoClase,
        usaPackPromocional: item.usaPackPromocional,
        packSeleccionado: item.packSeleccionado,
        horariosSeleccionados: item.horariosSeleccionados,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        student: {
          id: item.studentId,
          firstName: item.studentFirstName,
          lastName: item.studentLastName,
          dni: item.studentDni,
        },
      })),
    });
  } catch (error) {
    return next(error);
  }
});

adminBookingsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const item = await getBookingDetail(getDb(), req.params.id);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminBookingsRouter.patch(
  "/:id/status",
  validateParams(idParamsSchema),
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const { status, adminNotes } = req.body as z.infer<typeof updateStatusSchema>;
      const estadoReserva = status === "CANCELLED" ? "cancelada" : "confirmada";
      const estadoPago = status === "CANCELLED" ? "rechazado" : "aprobado";
      const [item] = await getDb()
        .update(bookings)
        .set({
          status,
          estadoReserva,
          estadoPago,
          paidAt: status === "CANCELLED" ? null : new Date(),
          adminNotes,
          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, req.params.id), inArray(bookings.status, [...bookingStatuses])))
        .returning();

      if (!item) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      return res.json({
        item: {
          ...item,
          startTime: timeForResponse(item.startTime),
          endTime: timeForResponse(item.endTime),
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);
