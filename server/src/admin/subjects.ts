import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { subjects } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema, nullableTextSchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: nullableTextSchema,
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const updateSubjectSchema = subjectSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  isVisible: booleanQuerySchema,
});

export const adminSubjectsRouter = Router();

adminSubjectsRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, isVisible } = req.query as unknown as z.infer<typeof querySchema>;
    const items = await getDb()
      .select()
      .from(subjects)
      .where(isVisible === undefined ? undefined : eq(subjects.isVisible, isVisible))
      .orderBy(asc(subjects.displayOrder), asc(subjects.name))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminSubjectsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb().select().from(subjects).where(eq(subjects.id, req.params.id)).limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSubjectsRouter.post("/", validateBody(subjectSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(subjects)
      .values(req.body as z.infer<typeof subjectSchema>)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSubjectsRouter.patch("/:id", validateParams(idParamsSchema), validateBody(updateSubjectSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(subjects)
      .set({ ...(req.body as z.infer<typeof updateSubjectSchema>), updatedAt: new Date() })
      .where(eq(subjects.id, req.params.id))
      .returning();

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSubjectsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(subjects)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(subjects.id, req.params.id))
      .returning({ id: subjects.id, isVisible: subjects.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
