import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { subjectHighlights, subjects } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema, nullableTextSchema, shortNullableTextSchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const highlightSchema = z.object({
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  keywords: shortNullableTextSchema,
  definition: z.string().trim().min(1).max(5000),
  professions: nullableTextSchema,
  jobs: nullableTextSchema,
  imageUrl: z.string().trim().url().max(2000),
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const updateHighlightSchema = highlightSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  subjectId: z.string().uuid().optional(),
  isVisible: booleanQuerySchema,
});

export const adminSubjectHighlightsRouter = Router();

async function assertSubjectExists(subjectId: string | null | undefined) {
  if (!subjectId) {
    return true;
  }

  const [item] = await getDb().select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  return Boolean(item);
}

adminSubjectHighlightsRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, subjectId, isVisible } = req.query as unknown as z.infer<typeof querySchema>;
    const conditions = [];

    if (subjectId) conditions.push(eq(subjectHighlights.subjectId, subjectId));
    if (isVisible !== undefined) conditions.push(eq(subjectHighlights.isVisible, isVisible));

    const items = await getDb()
      .select()
      .from(subjectHighlights)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(subjectHighlights.displayOrder), asc(subjectHighlights.title))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminSubjectHighlightsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb().select().from(subjectHighlights).where(eq(subjectHighlights.id, req.params.id)).limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSubjectHighlightsRouter.post("/", validateBody(highlightSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof highlightSchema>;

    if (!(await assertSubjectExists(body.subjectId))) {
      return res.status(400).json({ error: "SUBJECT_NOT_FOUND" });
    }

    const [item] = await getDb().insert(subjectHighlights).values(body).returning();
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSubjectHighlightsRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateHighlightSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof updateHighlightSchema>;

      if (!(await assertSubjectExists(body.subjectId))) {
        return res.status(400).json({ error: "SUBJECT_NOT_FOUND" });
      }

      const [item] = await getDb()
        .update(subjectHighlights)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(subjectHighlights.id, req.params.id))
        .returning();

      if (!item) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      return res.json({ item });
    } catch (error) {
      return next(error);
    }
  },
);

adminSubjectHighlightsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(subjectHighlights)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(subjectHighlights.id, req.params.id))
      .returning({ id: subjectHighlights.id, isVisible: subjectHighlights.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
