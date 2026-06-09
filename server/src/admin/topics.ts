import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { subjects, topics } from "../db/schema.js";
import {
  booleanQuerySchema,
  idParamsSchema,
  listQuerySchema,
  nullableTextSchema,
  shortNullableTextSchema,
} from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const topicsQuerySchema = listQuerySchema.extend({
  subject: z.string().trim().min(1).max(120).optional(),
  educationLevel: z.string().trim().min(1).max(120).optional(),
  educationTrack: z.string().trim().min(1).max(120).optional(),
  schoolYear: z.string().trim().min(1).max(120).optional(),
  isVisible: booleanQuerySchema,
});

const createTopicSchema = z.object({
  title: z.string().trim().min(1).max(200),
  introduction: nullableTextSchema,
  importance: nullableTextSchema,
  subject: shortNullableTextSchema,
  subjectId: z.string().uuid().optional().nullable(),
  educationLevel: shortNullableTextSchema,
  educationTrack: shortNullableTextSchema,
  schoolYear: shortNullableTextSchema,
  relatedCareers: nullableTextSchema,
  estimatedMinutes: z.number().int().positive().max(600).default(60),
  isVisible: z.boolean().default(true),
});

const updateTopicSchema = createTopicSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

export const adminTopicsRouter = Router();

async function subjectNameFromId(subjectId: string | null | undefined) {
  if (!subjectId) {
    return null;
  }

  const [subject] = await getDb()
    .select({ name: subjects.name })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  return subject?.name ?? null;
}

adminTopicsRouter.get("/", validateQuery(topicsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, subject, educationLevel, educationTrack, schoolYear, isVisible } =
      req.query as unknown as z.infer<
      typeof topicsQuerySchema
    >;
    const conditions = [];

    if (subject) {
      conditions.push(eq(topics.subject, subject));
    }

    if (educationLevel) {
      conditions.push(eq(topics.educationLevel, educationLevel));
    }

    if (educationTrack) {
      conditions.push(eq(topics.educationTrack, educationTrack));
    }

    if (schoolYear) {
      conditions.push(eq(topics.schoolYear, schoolYear));
    }

    if (isVisible !== undefined) {
      conditions.push(eq(topics.isVisible, isVisible));
    }

    const items = await getDb()
      .select()
      .from(topics)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(topics.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminTopicsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb().select().from(topics).where(eq(topics.id, req.params.id)).limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminTopicsRouter.post("/", validateBody(createTopicSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createTopicSchema>;
    const subjectName = await subjectNameFromId(body.subjectId);

    if (body.subjectId && !subjectName) {
      return res.status(400).json({ error: "SUBJECT_NOT_FOUND" });
    }

    const [item] = await getDb()
      .insert(topics)
      .values({ ...body, subject: subjectName ?? body.subject })
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminTopicsRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateTopicSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof updateTopicSchema>;
      const subjectName = await subjectNameFromId(body.subjectId);

      if (body.subjectId && !subjectName) {
        return res.status(400).json({ error: "SUBJECT_NOT_FOUND" });
      }

      const [item] = await getDb()
        .update(topics)
        .set({
          ...body,
          ...(body.subjectId !== undefined ? { subject: subjectName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(topics.id, req.params.id))
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

adminTopicsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(topics)
      .set({
        isVisible: false,
        updatedAt: new Date(),
      })
      .where(eq(topics.id, req.params.id))
      .returning({ id: topics.id, isVisible: topics.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
