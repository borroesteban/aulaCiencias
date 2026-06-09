import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { bookingTopics, bookings } from "../db/schema.js";
import { attachOptionalUser } from "../auth/middleware.js";
import { shortNullableTextSchema } from "../http/schemas.js";
import { validateBody, validateQuery } from "../http/validation.js";
import {
  addHoursToTime,
  calculateBookingHours,
  calculateTotalAmount,
  countActiveBookingsForSlot,
  createStudentForBooking,
  getBookingSettings,
  getVisibleTopicsByIds,
  normalizeTime,
  slotStartsInPast,
  timeForResponse,
} from "./service.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform(normalizeTime);

const availabilityQuerySchema = z.object({
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema.optional(),
  topicIds: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : []))
    .pipe(z.array(z.string().uuid())),
});

const createBookingSchema = z.object({
  selectedDate: dateSchema,
  startTime: timeSchema,
  topicIds: z.array(z.string().uuid()).min(1),
  student: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    dni: z.string().trim().min(1).max(30),
    phone: shortNullableTextSchema,
    address: z.string().trim().min(1).max(500),
    responsibleName: z.string().trim().min(1).max(160),
    responsibleContact: z.string().trim().min(1).max(160),
  }),
});

const createBulkBookingSchema = createBookingSchema
  .omit({ selectedDate: true })
  .extend({ selectedDates: z.array(dateSchema).min(1).max(16) });

export const bookingsRouter = Router();

bookingsRouter.get("/availability", validateQuery(availabilityQuerySchema), async (req, res, next) => {
  try {
    const { date, startTime, endTime, topicIds } = req.query as unknown as z.infer<
      typeof availabilityQuerySchema
    >;

    if (slotStartsInPast(date, startTime)) {
      return res.json({
        available: false,
        reason: "PAST_SLOT",
        booked: 0,
        capacity: 0,
      });
    }

    const db = getDb();
    const settings = await getBookingSettings(db);

    if (!endTime && topicIds.length === 0) {
      return res.status(400).json({ error: "END_TIME_OR_TOPICS_REQUIRED" });
    }

    let calculatedEndTime = endTime;

    if (!calculatedEndTime) {
      const selectedTopics = await getVisibleTopicsByIds(db, topicIds);
      const selectedTopicIds = new Set(selectedTopics.map((topic) => topic.id));
      const hasMissingTopic = topicIds.some((topicId) => !selectedTopicIds.has(topicId));

      if (hasMissingTopic) {
        return res.status(400).json({ error: "INVALID_TOPICS" });
      }

      const bookingHours = calculateBookingHours(topicIds.length, settings.topicsPerHour);
      calculatedEndTime = addHoursToTime(startTime, bookingHours);
    }

    const booked = await countActiveBookingsForSlot(db, date, startTime, calculatedEndTime);

    return res.json({
      available: booked < settings.maxStudentsPerSlot,
      booked,
      capacity: settings.maxStudentsPerSlot,
      date,
      startTime: timeForResponse(startTime),
      endTime: timeForResponse(calculatedEndTime),
    });
  } catch (error) {
    return next(error);
  }
});

bookingsRouter.post("/bookings", attachOptionalUser, validateBody(createBookingSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createBookingSchema>;

    if (slotStartsInPast(body.selectedDate, body.startTime)) {
      return res.status(400).json({ error: "PAST_SLOT" });
    }

    const db = getDb();
    const createdBooking = await db.transaction(async (tx) => {
      const settings = await getBookingSettings(tx);
      const selectedTopics = await getVisibleTopicsByIds(tx, body.topicIds);
      const selectedTopicIds = new Set(selectedTopics.map((topic) => topic.id));
      const hasMissingTopic = body.topicIds.some((topicId) => !selectedTopicIds.has(topicId));

      if (hasMissingTopic) {
        throw new Error("INVALID_TOPICS");
      }

      const totalTopics = body.topicIds.length;
      const bookingHours = calculateBookingHours(totalTopics, settings.topicsPerHour);
      const endTime = addHoursToTime(body.startTime, bookingHours);
      const booked = await countActiveBookingsForSlot(tx, body.selectedDate, body.startTime, endTime);

      if (booked >= settings.maxStudentsPerSlot) {
        throw new Error("SLOT_FULL");
      }

      const student = await createStudentForBooking(tx, {
        ...body.student,
        phone: body.student.phone ?? null,
      }, { allowExistingStudent: Boolean(req.user) });
      const [booking] = await tx
        .insert(bookings)
        .values({
          studentId: student.id,
          status: "PENDING_PAYMENT",
          selectedDate: body.selectedDate,
          startTime: body.startTime,
          endTime,
          totalTopics,
          totalAmount: calculateTotalAmount(bookingHours, settings.pricePerHour),
          paymentAlias: settings.mercadoPagoAlias,
        })
        .returning();

      await tx.insert(bookingTopics).values(
        body.topicIds.map((topicId) => ({
          bookingId: booking.id,
          topicId,
        })),
      );

      return {
        booking,
        selectedTopics,
        payment: {
          alias: settings.mercadoPagoAlias,
          whatsappNumber: settings.whatsappNumber,
          instructions:
            "Transferi al alias indicado y envia WhatsApp al aula indicando quien envia el dinero y para que alumno.",
        },
      };
    });

    return res.status(201).json({
      booking: {
        id: createdBooking.booking.id,
        status: createdBooking.booking.status,
        selectedDate: createdBooking.booking.selectedDate,
        startTime: timeForResponse(createdBooking.booking.startTime),
        endTime: timeForResponse(createdBooking.booking.endTime),
        totalTopics: createdBooking.booking.totalTopics,
        totalAmount: createdBooking.booking.totalAmount,
        paymentAlias: createdBooking.booking.paymentAlias,
        topics: createdBooking.selectedTopics,
      },
      payment: createdBooking.payment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOPICS") {
      return res.status(400).json({ error: "INVALID_TOPICS" });
    }

    if (error instanceof Error && error.message === "SLOT_FULL") {
      return res.status(409).json({ error: "SLOT_FULL" });
    }

    if (error instanceof Error && error.message === "STUDENT_EXISTS") {
      return res.status(409).json({ error: "STUDENT_EXISTS" });
    }

    return next(error);
  }
});

bookingsRouter.post("/bookings/bulk", attachOptionalUser, validateBody(createBulkBookingSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createBulkBookingSchema>;

    if (body.selectedDates.some((selectedDate) => slotStartsInPast(selectedDate, body.startTime))) {
      return res.status(400).json({ error: "PAST_SLOT" });
    }

    const db = getDb();
    const created = await db.transaction(async (tx) => {
      const settings = await getBookingSettings(tx);
      const selectedTopics = await getVisibleTopicsByIds(tx, body.topicIds);
      const selectedTopicIds = new Set(selectedTopics.map((topic) => topic.id));
      const hasMissingTopic = body.topicIds.some((topicId) => !selectedTopicIds.has(topicId));

      if (hasMissingTopic) {
        throw new Error("INVALID_TOPICS");
      }

      const totalTopics = body.topicIds.length;
      const bookingHours = calculateBookingHours(totalTopics, settings.topicsPerHour);
      const endTime = addHoursToTime(body.startTime, bookingHours);
      const student = await createStudentForBooking(tx, {
        ...body.student,
        phone: body.student.phone ?? null,
      }, { allowExistingStudent: Boolean(req.user) });
      const bookingsCreated = [];

      for (const selectedDate of body.selectedDates) {
        const booked = await countActiveBookingsForSlot(tx, selectedDate, body.startTime, endTime);

        if (booked >= settings.maxStudentsPerSlot) {
          throw new Error("SLOT_FULL");
        }

        const [booking] = await tx
          .insert(bookings)
          .values({
            studentId: student.id,
            status: "PENDING_PAYMENT",
            selectedDate,
            startTime: body.startTime,
            endTime,
            totalTopics,
            totalAmount: calculateTotalAmount(bookingHours, settings.pricePerHour),
            paymentAlias: settings.mercadoPagoAlias,
          })
          .returning();

        await tx.insert(bookingTopics).values(
          body.topicIds.map((topicId) => ({
            bookingId: booking.id,
            topicId,
          })),
        );

        bookingsCreated.push(booking);
      }

      return {
        bookings: bookingsCreated,
        selectedTopics,
        payment: {
          alias: settings.mercadoPagoAlias,
          whatsappNumber: settings.whatsappNumber,
          instructions:
            "Transferi al alias indicado y envia WhatsApp al aula indicando quien envia el dinero y para que alumno.",
        },
      };
    });

    return res.status(201).json({
      bookings: created.bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        selectedDate: booking.selectedDate,
        startTime: timeForResponse(booking.startTime),
        endTime: timeForResponse(booking.endTime),
        totalTopics: booking.totalTopics,
        totalAmount: booking.totalAmount,
        paymentAlias: booking.paymentAlias,
        topics: created.selectedTopics,
      })),
      payment: created.payment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOPICS") {
      return res.status(400).json({ error: "INVALID_TOPICS" });
    }

    if (error instanceof Error && error.message === "SLOT_FULL") {
      return res.status(409).json({ error: "SLOT_FULL" });
    }

    if (error instanceof Error && error.message === "STUDENT_EXISTS") {
      return res.status(409).json({ error: "STUDENT_EXISTS" });
    }

    return next(error);
  }
});
