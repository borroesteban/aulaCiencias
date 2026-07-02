import { and, eq, gt, isNull } from "drizzle-orm";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { bookingTopics, bookings, subjects, topics } from "../db/schema.js";
import { attachOptionalUser } from "../auth/middleware.js";
import { nullableTextSchema, shortNullableTextSchema } from "../http/schemas.js";
import { validateBody, validateQuery } from "../http/validation.js";
import {
  canonicalBookingSubjectName,
  isBookingAvailableLevel,
  shouldListBookingTopicsForLevel,
} from "./catalog.js";
import {
  addHoursToTime,
  calculateBookingHours,
  calculateTotalAmount,
  countActiveBookingsForSlot,
  createReservationHoldExpiration,
  createStudentForBooking,
  getBookingSettings,
  getVisibleTopicsByIds,
  normalizeTime,
  slotStartsInPast,
  timeForResponse,
} from "./service.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform(normalizeTime);
const objetivoOptions = [
  "preparar_examen",
  "rendir_previa",
  "acompanamiento",
  "resolver_trabajos_practicos",
  "ingreso_facultad",
  "ingreso_profesorado",
  "duda_puntual",
] as const;
const modalidadSchema = z.enum(["virtual", "presencial"]);
const tipoClaseSchema = z.enum(["privada", "grupal"]);
const horarioSeleccionadoSchema = z.object({
  selectedDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  packId: shortNullableTextSchema,
});

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

const customTopicSchema = z.object({
  title: z.string().trim().min(1).max(240),
  subjectId: z.string().uuid().optional().nullable(),
  subject: shortNullableTextSchema,
  educationLevel: shortNullableTextSchema,
  educationTrack: shortNullableTextSchema,
  schoolYear: shortNullableTextSchema,
});

function nullableTopicCondition(column: any, value: string | null | undefined) {
  return value ? eq(column, value) : isNull(column);
}

function publicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureCustomSubject(db: any, subjectName: string | null | undefined) {
  const canonicalSubjectName = canonicalBookingSubjectName(subjectName);

  if (!canonicalSubjectName) {
    return null;
  }

  const slug = publicSlug(canonicalSubjectName);
  const [existingSubject] = await db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.slug, slug))
    .limit(1);

  if (existingSubject) {
    return existingSubject;
  }

  const [createdSubject] = await db
    .insert(subjects)
    .values({
      name: canonicalSubjectName,
      slug,
      description: "Materia habilitada para reservas.",
      displayOrder: 9999,
      isVisible: true,
    })
    .returning({ id: subjects.id, name: subjects.name });

  return createdSubject;
}

async function ensureCustomTopics(db: any, customTopics: z.infer<typeof customTopicSchema>[]) {
  const savedTopics = [];

  for (const customTopic of customTopics) {
    const title = customTopic.title.trim();
    const subject = canonicalBookingSubjectName(customTopic.subject);
    const educationLevel = customTopic.educationLevel ?? null;
    const educationTrack = customTopic.educationTrack ?? null;
    const schoolYear = customTopic.schoolYear ?? null;

    if (!subject || !isBookingAvailableLevel(educationLevel)) {
      throw new Error("INVALID_BOOKING_TOPIC_CONTEXT");
    }

    if (shouldListBookingTopicsForLevel(educationLevel) && !schoolYear) {
      throw new Error("INVALID_BOOKING_TOPIC_CONTEXT");
    }

    const customSubject = await ensureCustomSubject(db, subject);
    const subjectId = customSubject?.id ?? null;
    const [existingTopic] = await db
      .select({
        id: topics.id,
        title: topics.title,
        subject: topics.subject,
        educationLevel: topics.educationLevel,
        educationTrack: topics.educationTrack,
        schoolYear: topics.schoolYear,
        estimatedMinutes: topics.estimatedMinutes,
      })
      .from(topics)
      .where(
        and(
          eq(topics.title, title),
          nullableTopicCondition(topics.subject, subject),
          nullableTopicCondition(topics.educationLevel, educationLevel),
          nullableTopicCondition(topics.educationTrack, educationTrack),
          nullableTopicCondition(topics.schoolYear, schoolYear),
        ),
      )
      .limit(1);

    if (existingTopic) {
      savedTopics.push(existingTopic);
      continue;
    }

    const [createdTopic] = await db
      .insert(topics)
      .values({
        title,
        introduction: "Tema agregado desde una reserva.",
        importance: "Temario cargado por solicitud del alumno al reservar horario.",
        subject,
        subjectId,
        educationLevel,
        educationTrack,
        schoolYear,
        estimatedMinutes: 60,
        isVisible: true,
      })
      .returning({
        id: topics.id,
        title: topics.title,
        subject: topics.subject,
        educationLevel: topics.educationLevel,
        educationTrack: topics.educationTrack,
        schoolYear: topics.schoolYear,
        estimatedMinutes: topics.estimatedMinutes,
      });

    savedTopics.push(createdTopic);
  }

  return savedTopics;
}

const createBookingBaseSchema = z.object({
  selectedDate: dateSchema,
  startTime: timeSchema,
  topicIds: z.array(z.string().uuid()).default([]),
  customTopics: z.array(customTopicSchema).max(20).default([]),
  objetivos: z.array(z.enum(objetivoOptions)).min(1).max(objetivoOptions.length),
  modalidad: modalidadSchema,
  tipoClase: tipoClaseSchema,
  usaPackPromocional: z.boolean().default(false),
  packSeleccionado: shortNullableTextSchema,
  horariosSeleccionados: z.array(horarioSeleccionadoSchema).default([]),
  adminNotes: nullableTextSchema,
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

const createBookingSchema = createBookingBaseSchema.refine((value) => value.topicIds.length + value.customTopics.length > 0, {
  message: "At least one topic is required",
  path: ["topicIds"],
}).refine((value) => !value.usaPackPromocional || Boolean(value.packSeleccionado && value.horariosSeleccionados.length > 0), {
  message: "Pack bookings require a selected pack and selected schedules",
  path: ["packSeleccionado"],
});

const createBulkBookingSchema = createBookingBaseSchema
  .omit({ selectedDate: true })
  .extend({ selectedDates: z.array(dateSchema).min(1).max(16) })
  .refine((value) => value.topicIds.length + value.customTopics.length > 0, {
    message: "At least one topic is required",
    path: ["topicIds"],
  })
  .refine((value) => !value.usaPackPromocional || Boolean(value.packSeleccionado && value.horariosSeleccionados.length > 0), {
    message: "Pack bookings require a selected pack and selected schedules",
    path: ["packSeleccionado"],
  });

export const bookingsRouter = Router();

function selectedScheduleValues(
  dates: string[],
  startTime: string,
  endTime: string,
  packId: string | null | undefined,
) {
  return dates.map((selectedDate) => ({
    selectedDate,
    startTime: timeForResponse(startTime),
    endTime: timeForResponse(endTime),
    packId: packId ?? null,
  }));
}

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
    const [pendingReservation] = await db
      .select({ expiresAt: bookings.expiresAt })
      .from(bookings)
      .where(
        and(
          eq(bookings.selectedDate, date),
          eq(bookings.startTime, startTime),
          eq(bookings.endTime, calculatedEndTime),
          eq(bookings.estadoReserva, "reserva_pendiente"),
          gt(bookings.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return res.json({
      available: booked < settings.maxStudentsPerSlot,
      reason: booked >= settings.maxStudentsPerSlot
        ? pendingReservation ? "RESERVATION_PENDING" : "SLOT_FULL"
        : undefined,
      expiresAt: pendingReservation?.expiresAt ?? null,
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
    const bookingBatchId = randomUUID();
    const createdBooking = await db.transaction(async (tx) => {
      const settings = await getBookingSettings(tx);
      const customTopics = await ensureCustomTopics(tx, body.customTopics);
      const allTopicIds = Array.from(new Set([...body.topicIds, ...customTopics.map((topic) => topic.id)]));
      const selectedTopics = await getVisibleTopicsByIds(tx, allTopicIds);
      const selectedTopicIds = new Set(selectedTopics.map((topic) => topic.id));
      const hasMissingTopic = allTopicIds.some((topicId) => !selectedTopicIds.has(topicId));

      if (hasMissingTopic) {
        throw new Error("INVALID_TOPICS");
      }

      const totalTopics = allTopicIds.length;
      const bookingHours = calculateBookingHours(totalTopics, settings.topicsPerHour);
      const endTime = addHoursToTime(body.startTime, bookingHours);
      const totalAmount = calculateTotalAmount(bookingHours, settings.pricePerHour);
      const booked = await countActiveBookingsForSlot(tx, body.selectedDate, body.startTime, endTime);
      const horariosSeleccionados = selectedScheduleValues(
        [body.selectedDate],
        body.startTime,
        endTime,
        body.usaPackPromocional ? body.packSeleccionado : null,
      );

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
          bookingBatchId,
          estadoReserva: "reserva_pendiente",
          estadoPago: "pendiente",
          selectedDate: body.selectedDate,
          startTime: body.startTime,
          endTime,
          totalTopics,
          totalAmount,
          expiresAt: createReservationHoldExpiration(),
          adminNotes: body.adminNotes ?? null,
          objetivos: body.objetivos,
          modalidad: body.modalidad,
          tipoClase: body.tipoClase,
          usaPackPromocional: body.usaPackPromocional,
          packSeleccionado: body.usaPackPromocional ? body.packSeleccionado : null,
          horariosSeleccionados,
        })
        .returning();

      await tx.insert(bookingTopics).values(
        allTopicIds.map((topicId) => ({
          bookingId: booking.id,
          topicId,
        })),
      );

      return {
        booking,
        selectedTopics,
        whatsappNumber: settings.whatsappNumber,
      };
    });

    return res.status(201).json({
      booking: {
        id: createdBooking.booking.id,
        status: createdBooking.booking.status,
        bookingBatchId: createdBooking.booking.bookingBatchId,
        estadoReserva: createdBooking.booking.estadoReserva,
        estadoPago: createdBooking.booking.estadoPago,
        selectedDate: createdBooking.booking.selectedDate,
        startTime: timeForResponse(createdBooking.booking.startTime),
        endTime: timeForResponse(createdBooking.booking.endTime),
        totalTopics: createdBooking.booking.totalTopics,
        totalAmount: createdBooking.booking.totalAmount,
        montoSenia: createdBooking.booking.montoSenia,
        expiresAt: createdBooking.booking.expiresAt,
        paymentAlias: createdBooking.booking.paymentAlias,
        objetivos: createdBooking.booking.objetivos,
        modalidad: createdBooking.booking.modalidad,
        tipoClase: createdBooking.booking.tipoClase,
        usaPackPromocional: createdBooking.booking.usaPackPromocional,
        packSeleccionado: createdBooking.booking.packSeleccionado,
        horariosSeleccionados: createdBooking.booking.horariosSeleccionados,
        topics: createdBooking.selectedTopics,
      },
      reservation: {
        state: "reserva_pendiente",
        expiresAt: createdBooking.booking.expiresAt,
        holdMinutes: 15,
        whatsappNumber: createdBooking.whatsappNumber,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOPICS") {
      return res.status(400).json({ error: "INVALID_TOPICS" });
    }

    if (error instanceof Error && error.message === "INVALID_BOOKING_TOPIC_CONTEXT") {
      return res.status(400).json({ error: "INVALID_BOOKING_TOPIC_CONTEXT" });
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
    const bookingBatchId = randomUUID();
    const created = await db.transaction(async (tx) => {
      const settings = await getBookingSettings(tx);
      const customTopics = await ensureCustomTopics(tx, body.customTopics);
      const allTopicIds = Array.from(new Set([...body.topicIds, ...customTopics.map((topic) => topic.id)]));
      const selectedTopics = await getVisibleTopicsByIds(tx, allTopicIds);
      const selectedTopicIds = new Set(selectedTopics.map((topic) => topic.id));
      const hasMissingTopic = allTopicIds.some((topicId) => !selectedTopicIds.has(topicId));

      if (hasMissingTopic) {
        throw new Error("INVALID_TOPICS");
      }

      const totalTopics = allTopicIds.length;
      const bookingHours = calculateBookingHours(totalTopics, settings.topicsPerHour);
      const endTime = addHoursToTime(body.startTime, bookingHours);
      const totalAmount = calculateTotalAmount(bookingHours, settings.pricePerHour);
      const horariosSeleccionados = selectedScheduleValues(
        body.selectedDates,
        body.startTime,
        endTime,
        body.usaPackPromocional ? body.packSeleccionado : null,
      );
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
            bookingBatchId,
            estadoReserva: "reserva_pendiente",
            estadoPago: "pendiente",
            selectedDate,
            startTime: body.startTime,
            endTime,
            totalTopics,
            totalAmount,
            expiresAt: createReservationHoldExpiration(),
            adminNotes: body.adminNotes ?? null,
            objetivos: body.objetivos,
            modalidad: body.modalidad,
            tipoClase: body.tipoClase,
            usaPackPromocional: body.usaPackPromocional,
            packSeleccionado: body.usaPackPromocional ? body.packSeleccionado : null,
            horariosSeleccionados,
          })
          .returning();

        await tx.insert(bookingTopics).values(
          allTopicIds.map((topicId) => ({
            bookingId: booking.id,
            topicId,
          })),
        );

        bookingsCreated.push(booking);
      }

      return {
        bookings: bookingsCreated,
        selectedTopics,
        whatsappNumber: settings.whatsappNumber,
      };
    });

    return res.status(201).json({
      bookings: created.bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        bookingBatchId: booking.bookingBatchId,
        estadoReserva: booking.estadoReserva,
        estadoPago: booking.estadoPago,
        selectedDate: booking.selectedDate,
        startTime: timeForResponse(booking.startTime),
        endTime: timeForResponse(booking.endTime),
        totalTopics: booking.totalTopics,
        totalAmount: booking.totalAmount,
        montoSenia: booking.montoSenia,
        expiresAt: booking.expiresAt,
        paymentAlias: booking.paymentAlias,
        objetivos: booking.objetivos,
        modalidad: booking.modalidad,
        tipoClase: booking.tipoClase,
        usaPackPromocional: booking.usaPackPromocional,
        packSeleccionado: booking.packSeleccionado,
        horariosSeleccionados: booking.horariosSeleccionados,
        topics: created.selectedTopics,
      })),
      reservation: {
        state: "reserva_pendiente",
        expiresAt: created.bookings[0]?.expiresAt ?? null,
        holdMinutes: 15,
        whatsappNumber: created.whatsappNumber,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TOPICS") {
      return res.status(400).json({ error: "INVALID_TOPICS" });
    }

    if (error instanceof Error && error.message === "INVALID_BOOKING_TOPIC_CONTEXT") {
      return res.status(400).json({ error: "INVALID_BOOKING_TOPIC_CONTEXT" });
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
