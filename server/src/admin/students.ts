import { and, asc, eq, ilike, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { guardians, studentGuardians, students } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema, shortNullableTextSchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const studentSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dni: z.string().trim().min(1).max(30),
  phone: shortNullableTextSchema,
  address: z.string().trim().min(1).max(500),
  responsibleName: z.string().trim().min(1).max(160),
  responsibleContact: z.string().trim().min(1).max(160),
  isActive: z.boolean().default(true),
  guardianIds: z.array(z.string().uuid()).optional(),
});

const updateStudentSchema = studentSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  isActive: booleanQuerySchema,
});

export const adminStudentsRouter = Router();

async function getStudentGuardians(studentId: string) {
  return getDb()
    .select({
      id: guardians.id,
      firstName: guardians.firstName,
      lastName: guardians.lastName,
      dni: guardians.dni,
      phone: guardians.phone,
      email: guardians.email,
      relationship: studentGuardians.relationship,
      isPrimary: studentGuardians.isPrimary,
      isAuthorized: studentGuardians.isAuthorized,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .where(eq(studentGuardians.studentId, studentId))
    .orderBy(asc(studentGuardians.relationship), asc(guardians.firstName));
}

async function attachGuardians(studentId: string, guardianIds: string[] | undefined) {
  if (guardianIds === undefined) {
    return;
  }

  await getDb().delete(studentGuardians).where(eq(studentGuardians.studentId, studentId));

  if (guardianIds.length === 0) {
    return;
  }

  await getDb().insert(studentGuardians).values(
    guardianIds.map((guardianId, index) => ({
      studentId,
      guardianId,
      relationship: "Responsable",
      isPrimary: index === 0,
      isAuthorized: true,
    })),
  );
}

adminStudentsRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, search, isActive } = req.query as unknown as z.infer<typeof querySchema>;
    const conditions = [];

    if (isActive !== undefined) conditions.push(eq(students.isActive, isActive));

    if (search) {
      const likeSearch = `%${search}%`;
      const searchCondition = or(
        ilike(students.firstName, likeSearch),
        ilike(students.lastName, likeSearch),
        ilike(students.dni, likeSearch),
        ilike(students.responsibleName, likeSearch),
      );

      if (searchCondition) conditions.push(searchCondition);
    }

    const items = await getDb()
      .select()
      .from(students)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(students.lastName), asc(students.firstName))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminStudentsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [student] = await getDb().select().from(students).where(eq(students.id, req.params.id)).limit(1);

    if (!student) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item: { ...student, guardians: await getStudentGuardians(student.id) } });
  } catch (error) {
    return next(error);
  }
});

adminStudentsRouter.post("/", validateBody(studentSchema), async (req, res, next) => {
  try {
    const { guardianIds, ...body } = req.body as z.infer<typeof studentSchema>;
    const [item] = await getDb().insert(students).values(body).returning();
    await attachGuardians(item.id, guardianIds);

    return res.status(201).json({ item: { ...item, guardians: await getStudentGuardians(item.id) } });
  } catch (error) {
    return next(error);
  }
});

adminStudentsRouter.patch("/:id", validateParams(idParamsSchema), validateBody(updateStudentSchema), async (req, res, next) => {
  try {
    const { guardianIds, ...body } = req.body as z.infer<typeof updateStudentSchema>;
    const [item] = await getDb()
      .update(students)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(students.id, req.params.id))
      .returning();

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    await attachGuardians(item.id, guardianIds);
    return res.json({ item: { ...item, guardians: await getStudentGuardians(item.id) } });
  } catch (error) {
    return next(error);
  }
});

adminStudentsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(students)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(students.id, req.params.id))
      .returning({ id: students.id, isActive: students.isActive });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
