import { and, asc, eq, ilike, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { guardians } from "../db/schema.js";
import {
  booleanQuerySchema,
  idParamsSchema,
  listQuerySchema,
  nullableTextSchema,
  shortNullableTextSchema,
} from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const guardianSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: shortNullableTextSchema,
  dni: shortNullableTextSchema,
  phone: shortNullableTextSchema,
  email: z.string().trim().email().max(320).optional().nullable(),
  relationship: shortNullableTextSchema,
  notes: nullableTextSchema,
  isActive: z.boolean().default(true),
});

const updateGuardianSchema = guardianSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  isActive: booleanQuerySchema,
});

export const adminGuardiansRouter = Router();

adminGuardiansRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, search, isActive } = req.query as unknown as z.infer<typeof querySchema>;
    const conditions = [];

    if (isActive !== undefined) conditions.push(eq(guardians.isActive, isActive));

    if (search) {
      const likeSearch = `%${search}%`;
      const searchCondition = or(
        ilike(guardians.firstName, likeSearch),
        ilike(guardians.lastName, likeSearch),
        ilike(guardians.dni, likeSearch),
        ilike(guardians.phone, likeSearch),
        ilike(guardians.email, likeSearch),
      );

      if (searchCondition) conditions.push(searchCondition);
    }

    const items = await getDb()
      .select()
      .from(guardians)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(guardians.firstName), asc(guardians.lastName))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminGuardiansRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb().select().from(guardians).where(eq(guardians.id, req.params.id)).limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminGuardiansRouter.post("/", validateBody(guardianSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(guardians)
      .values(req.body as z.infer<typeof guardianSchema>)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminGuardiansRouter.patch("/:id", validateParams(idParamsSchema), validateBody(updateGuardianSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(guardians)
      .set({ ...(req.body as z.infer<typeof updateGuardianSchema>), updatedAt: new Date() })
      .where(eq(guardians.id, req.params.id))
      .returning();

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminGuardiansRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(guardians)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(guardians.id, req.params.id))
      .returning({ id: guardians.id, isActive: guardians.isActive });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
