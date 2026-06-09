import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { getDb } from "../db/client.js";
import { subjectHighlights, subjects } from "../db/schema.js";

export const subjectHighlightsRouter = Router();

function splitList(value: string | null) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

subjectHighlightsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select({
        id: subjectHighlights.id,
        subjectId: subjectHighlights.subjectId,
        subjectName: subjects.name,
        title: subjectHighlights.title,
        slug: subjectHighlights.slug,
        keywords: subjectHighlights.keywords,
        definition: subjectHighlights.definition,
        professions: subjectHighlights.professions,
        jobs: subjectHighlights.jobs,
        imageUrl: subjectHighlights.imageUrl,
        displayOrder: subjectHighlights.displayOrder,
      })
      .from(subjectHighlights)
      .leftJoin(subjects, eq(subjectHighlights.subjectId, subjects.id))
      .where(eq(subjectHighlights.isVisible, true))
      .orderBy(asc(subjectHighlights.displayOrder), asc(subjectHighlights.title));

    return res.json({
      items: rows.map((row) => ({
        ...row,
        keywords: splitList(row.keywords),
        professions: splitList(row.professions),
        jobs: splitList(row.jobs),
      })),
    });
  } catch (error) {
    return next(error);
  }
});
