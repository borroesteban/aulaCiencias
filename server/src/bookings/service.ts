import { and, count, eq, inArray, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../db/schema.js";
import { appSettings, bookingTopics, bookings, guardians, studentGuardians, students, topics } from "../db/schema.js";

export const activeBookingStatuses = ["PENDING_PAYMENT", "PAID", "CONFIRMED"] as const;

export interface BookingSettings {
  pricePerHour: number;
  topicsPerHour: number;
  maxStudentsPerSlot: number;
  mercadoPagoAlias: string | null;
  whatsappNumber: string;
}

export function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export function timeForResponse(value: string) {
  return value.slice(0, 5);
}

export function slotStartsInPast(selectedDate: string, startTime: string) {
  return new Date(`${selectedDate}T${timeForResponse(startTime)}:00`).getTime() <= Date.now();
}

export function addHoursToTime(startTime: string, hours: number) {
  const [hour = "0", minute = "0"] = timeForResponse(startTime).split(":");
  const date = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute)));
  date.setUTCHours(date.getUTCHours() + hours);

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}:00`;
}

export function calculateBookingHours(totalTopics: number, topicsPerHour: number) {
  return Math.max(1, Math.ceil(totalTopics / topicsPerHour));
}

export function calculateTotalAmount(hours: number, pricePerHour: number) {
  return (hours * pricePerHour).toFixed(2);
}

export async function getBookingSettings(db: NodePgDatabase<typeof schema>): Promise<BookingSettings> {
  const [settings] = await db.select().from(appSettings).limit(1);

  return {
    pricePerHour: Number(settings?.pricePerHour ?? 0),
    topicsPerHour: settings?.topicsPerHour ?? 1,
    maxStudentsPerSlot: settings?.maxStudentsPerSlot ?? 1,
    mercadoPagoAlias: settings?.mercadoPagoAlias ?? null,
    whatsappNumber: settings?.whatsappNumber ?? "",
  };
}

export async function countActiveBookingsForSlot(
  db: NodePgDatabase<typeof schema>,
  selectedDate: string,
  startTime: string,
  endTime: string,
) {
  const [result] = await db
    .select({ total: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.selectedDate, selectedDate),
        eq(bookings.startTime, normalizeTime(startTime)),
        eq(bookings.endTime, normalizeTime(endTime)),
        inArray(bookings.status, [...activeBookingStatuses]),
      ),
    );

  return result?.total ?? 0;
}

export async function getVisibleTopicsByIds(db: NodePgDatabase<typeof schema>, topicIds: string[]) {
  return db
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
    .where(and(inArray(topics.id, topicIds), eq(topics.isVisible, true)));
}

export async function createStudentForBooking(
  db: NodePgDatabase<typeof schema>,
  input: {
    firstName: string;
    lastName: string;
    dni: string;
    phone: string | null;
    address: string;
    responsibleName: string;
    responsibleContact: string;
  },
  options: { allowExistingStudent?: boolean } = {},
) {
  async function attachGuardian(studentId: string) {
    const responsibleName = input.responsibleName.trim();
    const responsibleContact = input.responsibleContact.trim();
    const [existingGuardian] = await db
      .select()
      .from(guardians)
      .where(and(eq(guardians.firstName, responsibleName), eq(guardians.phone, responsibleContact)))
      .limit(1);
    const guardian =
      existingGuardian ??
      (
        await db
          .insert(guardians)
          .values({
            firstName: responsibleName,
            phone: responsibleContact,
            relationship: "Responsable",
            isActive: true,
          })
          .returning()
      )[0];

    await db
      .insert(studentGuardians)
      .values({
        studentId,
        guardianId: guardian.id,
        relationship: "Responsable",
        isPrimary: true,
        isAuthorized: true,
      })
      .onConflictDoUpdate({
        target: [studentGuardians.studentId, studentGuardians.guardianId],
        set: {
          relationship: "Responsable",
          isPrimary: true,
          isAuthorized: true,
          updatedAt: new Date(),
        },
      });
  }

  const [existingStudent] = await db
    .select()
    .from(students)
    .where(eq(students.dni, input.dni))
    .limit(1);

  if (existingStudent) {
    if (options.allowExistingStudent) {
      await db
        .update(students)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          address: input.address,
          responsibleName: input.responsibleName,
          responsibleContact: input.responsibleContact,
          updatedAt: new Date(),
        })
        .where(eq(students.id, existingStudent.id));

      await attachGuardian(existingStudent.id);

      return {
        ...existingStudent,
        ...input,
        updatedAt: new Date(),
      };
    }

    throw new Error("STUDENT_EXISTS");
  }

  const [student] = await db.insert(students).values(input).returning();
  await attachGuardian(student.id);
  return student;
}

export async function getBookingDetail(db: NodePgDatabase<typeof schema>, id: string) {
  const [booking] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      selectedDate: bookings.selectedDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      totalTopics: bookings.totalTopics,
      totalAmount: bookings.totalAmount,
      paymentAlias: bookings.paymentAlias,
      adminNotes: bookings.adminNotes,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      studentId: students.id,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentDni: students.dni,
      studentPhone: students.phone,
      studentAddress: students.address,
      responsibleName: students.responsibleName,
      responsibleContact: students.responsibleContact,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) {
    return null;
  }

  const selectedTopics = await db
    .select({
      id: topics.id,
      title: topics.title,
      subject: topics.subject,
    })
    .from(bookingTopics)
    .innerJoin(topics, eq(bookingTopics.topicId, topics.id))
    .where(eq(bookingTopics.bookingId, id));

  return {
    id: booking.id,
    status: booking.status,
    selectedDate: booking.selectedDate,
    startTime: timeForResponse(booking.startTime),
    endTime: timeForResponse(booking.endTime),
    totalTopics: booking.totalTopics,
    totalAmount: booking.totalAmount,
    paymentAlias: booking.paymentAlias,
    adminNotes: booking.adminNotes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    student: {
      id: booking.studentId,
      firstName: booking.studentFirstName,
      lastName: booking.studentLastName,
      dni: booking.studentDni,
      phone: booking.studentPhone,
      address: booking.studentAddress,
      responsibleName: booking.responsibleName,
      responsibleContact: booking.responsibleContact,
    },
    topics: selectedTopics,
  };
}

export function nonCancelledStatusCondition() {
  return ne(bookings.status, "CANCELLED");
}
