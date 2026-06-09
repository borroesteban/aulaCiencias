import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { getDb } from "../db/client.js";
import { subjects } from "../db/schema.js";

export const subjectsRouter = Router();

subjectsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await getDb()
      .select({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug,
        description: subjects.description,
        displayOrder: subjects.displayOrder,
      })
      .from(subjects)
      .where(eq(subjects.isVisible, true))
      .orderBy(asc(subjects.displayOrder), asc(subjects.name));

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});
