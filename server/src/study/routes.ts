import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { academicPrograms, institutions, programTopics } from "../db/schema.js";
import { listQuerySchema } from "../http/schemas.js";
import { validateQuery } from "../http/validation.js";

const programsQuerySchema = listQuerySchema.extend({
  q: z.string().trim().max(160).optional(),
  includeTopics: z.string().trim().max(600).optional(),
  excludeTopics: z.string().trim().max(600).optional(),
  academicLevel: z.string().trim().max(80).optional(),
  institutionId: z.string().uuid().optional(),
});

export const studyRouter = Router();

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function listParam(value: string | undefined) {
  return value
    ? value
        .split(",")
        .map((item) => normalize(item))
        .filter(Boolean)
    : [];
}

studyRouter.get("/institutions", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select()
      .from(institutions)
      .where(eq(institutions.isActive, true))
      .orderBy(asc(institutions.name));

    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
});

studyRouter.get("/academic-levels", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select({ academicLevel: academicPrograms.academicLevel })
      .from(academicPrograms)
      .where(eq(academicPrograms.isActive, true));

    return res.json({ items: Array.from(new Set(rows.map((row) => row.academicLevel))).sort() });
  } catch (error) {
    return next(error);
  }
});

studyRouter.get("/topics", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select({ name: programTopics.name, normalizedName: programTopics.normalizedName })
      .from(programTopics)
      .orderBy(asc(programTopics.normalizedName));

    const topics = new Map(rows.map((row) => [row.normalizedName, row.name]));

    return res.json({ items: Array.from(topics, ([normalizedName, name]) => ({ normalizedName, name })) });
  } catch (error) {
    return next(error);
  }
});

studyRouter.get("/programs", validateQuery(programsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, q, includeTopics, excludeTopics, academicLevel, institutionId } =
      req.query as unknown as z.infer<typeof programsQuerySchema>;
    const rows = await getDb()
      .select({
        id: academicPrograms.id,
        institutionId: academicPrograms.institutionId,
        name: academicPrograms.name,
        academicLevel: academicPrograms.academicLevel,
        titleGranted: academicPrograms.titleGranted,
        duration: academicPrograms.duration,
        modality: academicPrograms.modality,
        description: academicPrograms.description,
        website: academicPrograms.website,
        sourceName: academicPrograms.sourceName,
        sourceUrl: academicPrograms.sourceUrl,
        lastVerifiedAt: academicPrograms.lastVerifiedAt,
        institutionName: institutions.name,
        institutionPhone: institutions.phone,
        institutionEmail: institutions.email,
        institutionWebsite: institutions.website,
      })
      .from(academicPrograms)
      .innerJoin(institutions, eq(academicPrograms.institutionId, institutions.id))
      .where(eq(academicPrograms.isActive, true))
      .orderBy(asc(academicPrograms.name));

    const topicRows = await getDb().select().from(programTopics);
    const topicsByProgram = new Map<string, typeof topicRows>();
    topicRows.forEach((topic) => {
      topicsByProgram.set(topic.programId, [...(topicsByProgram.get(topic.programId) ?? []), topic]);
    });

    const query = normalize(q ?? "");
    const include = listParam(includeTopics);
    const exclude = listParam(excludeTopics);

    const filtered = rows.filter((row) => {
      const topics = topicsByProgram.get(row.id) ?? [];
      const topicKeys = topics.map((topic) => topic.normalizedName);
      const haystack = normalize([row.name, row.institutionName, row.description, ...topics.map((topic) => topic.name)].filter(Boolean).join(" "));

      return (
        (!institutionId || row.institutionId === institutionId) &&
        (!academicLevel || row.academicLevel === academicLevel) &&
        (!query || haystack.includes(query)) &&
        include.every((topic) => topicKeys.some((key) => key.includes(topic) || topic.includes(key))) &&
        exclude.every((topic) => !topicKeys.some((key) => key.includes(topic) || topic.includes(key)))
      );
    });

    return res.json({
      items: filtered.slice(offset, offset + limit).map((row) => ({
        ...row,
        topics: (topicsByProgram.get(row.id) ?? []).sort((a, b) => a.displayOrder - b.displayOrder),
      })),
      total: filtered.length,
    });
  } catch (error) {
    return next(error);
  }
});
