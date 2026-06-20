import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.js";
import {
  bookingTopics,
  bookings,
  studentDownloadEvents,
  studentFamilySummaries,
  studentPendingExercises,
  studentSeenTopics,
  studentSubjectProgress,
  studentTeacherNotes,
  students,
  topics,
} from "../db/schema.js";
import { timeForResponse } from "../bookings/service.js";

type Db = NodePgDatabase<typeof schema>;

const confirmedReservationStates = new Set(["confirmada"]);
const confirmedLegacyStatuses = new Set(["PAID", "CONFIRMED", "COMPLETED"]);

function classStartTime(selectedDate: string, startTime: string) {
  return new Date(`${selectedDate}T${timeForResponse(startTime)}:00`);
}

async function getStudentOrThrow(db: Db, studentId: string) {
  const [student] = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      dni: students.dni,
      phone: students.phone,
      responsibleName: students.responsibleName,
      responsibleContact: students.responsibleContact,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  return {
    ...student,
    name: `${student.firstName} ${student.lastName}`.trim(),
  };
}

async function getStudentClasses(db: Db, studentId: string) {
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      estadoReserva: bookings.estadoReserva,
      estadoPago: bookings.estadoPago,
      selectedDate: bookings.selectedDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      totalAmount: bookings.totalAmount,
      modalidad: bookings.modalidad,
      tipoClase: bookings.tipoClase,
      packSeleccionado: bookings.packSeleccionado,
      topicId: topics.id,
      topicTitle: topics.title,
      topicSubject: topics.subject,
    })
    .from(bookings)
    .leftJoin(bookingTopics, eq(bookingTopics.bookingId, bookings.id))
    .leftJoin(topics, eq(bookingTopics.topicId, topics.id))
    .where(eq(bookings.studentId, studentId))
    .orderBy(desc(bookings.selectedDate), desc(bookings.startTime));

  const byBooking = new Map<
    string,
    {
      id: string;
      status: string;
      estadoReserva: string;
      estadoPago: string;
      selectedDate: string;
      startTime: string;
      endTime: string;
      totalAmount: string;
      modalidad: string;
      tipoClase: string;
      packSeleccionado: string | null;
      topics: Array<{ id: string; title: string; subject: string | null }>;
    }
  >();

  for (const row of rows) {
    const existing =
      byBooking.get(row.id) ??
      {
        id: row.id,
        status: row.status,
        estadoReserva: row.estadoReserva,
        estadoPago: row.estadoPago,
        selectedDate: row.selectedDate,
        startTime: timeForResponse(row.startTime),
        endTime: timeForResponse(row.endTime),
        totalAmount: row.totalAmount,
        modalidad: row.modalidad,
        tipoClase: row.tipoClase,
        packSeleccionado: row.packSeleccionado,
        topics: [],
      };

    if (row.topicId && row.topicTitle) {
      existing.topics.push({
        id: row.topicId,
        title: row.topicTitle,
        subject: row.topicSubject,
      });
    }

    byBooking.set(row.id, existing);
  }

  return Array.from(byBooking.values()).filter(
    (booking) =>
      confirmedReservationStates.has(booking.estadoReserva) ||
      confirmedLegacyStatuses.has(booking.status),
  );
}

export async function getStudentDashboard(db: Db, studentId: string) {
  const student = await getStudentOrThrow(db, studentId);
  const classes = await getStudentClasses(db, studentId);
  const now = Date.now();
  const upcomingClasses = classes
    .filter((booking) => classStartTime(booking.selectedDate, booking.startTime).getTime() >= now)
    .sort((a, b) => classStartTime(a.selectedDate, a.startTime).getTime() - classStartTime(b.selectedDate, b.startTime).getTime());
  const classHistory = classes
    .filter((booking) => classStartTime(booking.selectedDate, booking.startTime).getTime() < now)
    .sort((a, b) => classStartTime(b.selectedDate, b.startTime).getTime() - classStartTime(a.selectedDate, a.startTime).getTime());

  const [subjectProgress, seenTopics, downloadedMaterials, pendingExercises, teacherNotes] = await Promise.all([
    db
      .select()
      .from(studentSubjectProgress)
      .where(eq(studentSubjectProgress.studentId, studentId))
      .orderBy(desc(studentSubjectProgress.updatedAt)),
    db
      .select()
      .from(studentSeenTopics)
      .where(eq(studentSeenTopics.studentId, studentId))
      .orderBy(desc(studentSeenTopics.seenAt)),
    db
      .select()
      .from(studentDownloadEvents)
      .where(eq(studentDownloadEvents.studentId, studentId))
      .orderBy(desc(studentDownloadEvents.downloadedAt)),
    db
      .select()
      .from(studentPendingExercises)
      .where(eq(studentPendingExercises.studentId, studentId))
      .orderBy(desc(studentPendingExercises.createdAt)),
    db
      .select()
      .from(studentTeacherNotes)
      .where(eq(studentTeacherNotes.studentId, studentId))
      .orderBy(desc(studentTeacherNotes.createdAt)),
  ]);

  return {
    student,
    upcomingClasses,
    classHistory,
    subjectProgress,
    seenTopics,
    downloadedMaterials,
    pendingExercises,
    teacherNotes,
  };
}

export async function getStudentFamilySummary(db: Db, studentId: string) {
  const dashboard = await getStudentDashboard(db, studentId);
  const [summary] = await db
    .select()
    .from(studentFamilySummaries)
    .where(eq(studentFamilySummaries.studentId, studentId))
    .limit(1);

  const visibleTeacherNotes = dashboard.teacherNotes.filter((note) => note.visibleToFamily);
  const latestSeen = dashboard.seenTopics.slice(0, 3).map((topic) => topic.topic).join(", ");
  const openExercises = dashboard.pendingExercises
    .filter((exercise) => exercise.status !== "completado")
    .slice(0, 3)
    .map((exercise) => exercise.title)
    .join(", ");
  const progressAverage = dashboard.subjectProgress.length
    ? Math.round(
        dashboard.subjectProgress.reduce((total, item) => total + item.progressPercent, 0) /
          dashboard.subjectProgress.length,
      )
    : null;

  return {
    studentName: dashboard.student.name,
    currentWork: summary?.currentWork ?? (latestSeen ? `Estamos trabajando: ${latestSeen}.` : "Todavia no hay temas cargados."),
    needsReinforcement:
      summary?.needsReinforcement ?? (openExercises ? `Conviene reforzar: ${openExercises}.` : "Sin refuerzos pendientes cargados."),
    generalStatus:
      summary?.generalStatus ??
      (progressAverage === null ? "Seguimiento en preparacion." : `Progreso general aproximado: ${progressAverage}%.`),
    nextClass: dashboard.upcomingClasses[0] ?? null,
    visibleTeacherNotes,
    updatedAt: summary?.updatedAt ?? visibleTeacherNotes[0]?.updatedAt ?? new Date().toISOString(),
  };
}

export async function addSubjectProgress(
  db: Db,
  studentId: string,
  input: { subject: string; progressPercent: number; status?: string | null; teacherNotes?: string | null },
) {
  await getStudentOrThrow(db, studentId);
  const [created] = await db
    .insert(studentSubjectProgress)
    .values({
      studentId,
      subject: input.subject,
      progressPercent: input.progressPercent,
      status: input.status ?? null,
      teacherNotes: input.teacherNotes ?? null,
    })
    .returning();

  return created;
}

export async function addSeenTopic(
  db: Db,
  studentId: string,
  input: { subject: string; topic: string; bookingId?: string | null },
) {
  await getStudentOrThrow(db, studentId);
  const [created] = await db
    .insert(studentSeenTopics)
    .values({
      studentId,
      subject: input.subject,
      topic: input.topic,
      bookingId: input.bookingId ?? null,
    })
    .returning();

  return created;
}

export async function addPendingExercise(
  db: Db,
  studentId: string,
  input: { subject: string; title: string; description?: string | null; dueDate?: Date | null; status?: string | null },
) {
  await getStudentOrThrow(db, studentId);
  const [created] = await db
    .insert(studentPendingExercises)
    .values({
      studentId,
      subject: input.subject,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      status: input.status ?? "pendiente",
    })
    .returning();

  return created;
}

export async function addTeacherNote(
  db: Db,
  studentId: string,
  input: { subject?: string | null; note: string; visibleToFamily?: boolean },
) {
  await getStudentOrThrow(db, studentId);
  const [created] = await db
    .insert(studentTeacherNotes)
    .values({
      studentId,
      subject: input.subject ?? null,
      note: input.note,
      visibleToFamily: input.visibleToFamily ?? true,
    })
    .returning();

  return created;
}

export async function upsertFamilySummary(
  db: Db,
  studentId: string,
  input: { currentWork?: string | null; needsReinforcement?: string | null; generalStatus?: string | null },
) {
  await getStudentOrThrow(db, studentId);
  const [summary] = await db
    .insert(studentFamilySummaries)
    .values({
      studentId,
      currentWork: input.currentWork ?? null,
      needsReinforcement: input.needsReinforcement ?? null,
      generalStatus: input.generalStatus ?? null,
    })
    .onConflictDoUpdate({
      target: studentFamilySummaries.studentId,
      set: {
        currentWork: input.currentWork ?? null,
        needsReinforcement: input.needsReinforcement ?? null,
        generalStatus: input.generalStatus ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return summary;
}

export async function registerDownloadEvent(
  db: Db,
  studentId: string,
  input: { downloadableId?: string | null; title: string },
) {
  await getStudentOrThrow(db, studentId);
  const [created] = await db
    .insert(studentDownloadEvents)
    .values({
      studentId,
      downloadableId: input.downloadableId ?? null,
      title: input.title,
    })
    .returning();

  return created;
}
