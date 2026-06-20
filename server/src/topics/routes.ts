import { and, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { bookingCatalogTopicLevels, bookingSubjectNames } from "../bookings/catalog.js";
import { getDb } from "../db/client.js";
import { topics } from "../db/schema.js";
import { idParamsSchema, listQuerySchema } from "../http/schemas.js";
import { validateParams, validateQuery } from "../http/validation.js";

const topicsQuerySchema = listQuerySchema.extend({
  subject: z.string().trim().min(1).max(120).optional(),
  educationLevel: z.string().trim().min(1).max(120).optional(),
  educationTrack: z.string().trim().min(1).max(120).optional(),
  schoolYear: z.string().trim().min(1).max(120).optional(),
});

export const topicsRouter = Router();

const publicTopicFields = {
  id: topics.id,
  title: topics.title,
  introduction: topics.introduction,
  importance: topics.importance,
  subject: topics.subject,
  subjectId: topics.subjectId,
  educationLevel: topics.educationLevel,
  educationTrack: topics.educationTrack,
  schoolYear: topics.schoolYear,
  relatedCareers: topics.relatedCareers,
  estimatedMinutes: topics.estimatedMinutes,
  createdAt: topics.createdAt,
  updatedAt: topics.updatedAt,
};

topicsRouter.get("/", validateQuery(topicsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, subject, educationLevel, educationTrack, schoolYear } =
      req.query as unknown as z.infer<typeof topicsQuerySchema>;
    const conditions = [
      eq(topics.isVisible, true),
      inArray(topics.subject, bookingSubjectNames),
      inArray(topics.educationLevel, [...bookingCatalogTopicLevels]),
    ];

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

    const items = await getDb()
      .select(publicTopicFields)
      .from(topics)
      .where(and(...conditions))
      .orderBy(desc(topics.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

topicsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [topic] = await getDb()
      .select(publicTopicFields)
      .from(topics)
      .where(and(eq(topics.id, req.params.id), eq(topics.isVisible, true)))
      .limit(1);

    if (!topic) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item: topic });
  } catch (error) {
    return next(error);
  }
});
