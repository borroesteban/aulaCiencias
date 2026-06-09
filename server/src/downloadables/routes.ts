import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { downloadableCategories, downloadableContents } from "../db/schema.js";
import { listQuerySchema } from "../http/schemas.js";
import { validateQuery } from "../http/validation.js";

const downloadablesQuerySchema = listQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().trim().min(1).max(120).optional(),
});

export const downloadablesRouter = Router();

const downloadableFields = {
  id: downloadableContents.id,
  title: downloadableContents.title,
  description: downloadableContents.description,
  imageUrl: downloadableContents.imageUrl,
  categoryId: downloadableContents.categoryId,
  categoryName: downloadableCategories.name,
  categorySlug: downloadableCategories.slug,
  isFeatured: downloadableContents.isFeatured,
  createdAt: downloadableContents.createdAt,
  updatedAt: downloadableContents.updatedAt,
};

downloadablesRouter.get("/", validateQuery(downloadablesQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, categoryId, categorySlug } = req.query as unknown as z.infer<
      typeof downloadablesQuerySchema
    >;
    const conditions = [eq(downloadableContents.isVisible, true)];

    if (categoryId) {
      conditions.push(eq(downloadableContents.categoryId, categoryId));
    }

    if (categorySlug) {
      conditions.push(eq(downloadableCategories.slug, categorySlug));
    }

    const items = await getDb()
      .select(downloadableFields)
      .from(downloadableContents)
      .innerJoin(
        downloadableCategories,
        eq(downloadableContents.categoryId, downloadableCategories.id),
      )
      .where(and(...conditions))
      .orderBy(desc(downloadableContents.isFeatured), desc(downloadableContents.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

downloadablesRouter.get("/recent", validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset } = req.query as unknown as z.infer<typeof listQuerySchema>;
    const items = await getDb()
      .select(downloadableFields)
      .from(downloadableContents)
      .innerJoin(
        downloadableCategories,
        eq(downloadableContents.categoryId, downloadableCategories.id),
      )
      .where(eq(downloadableContents.isVisible, true))
      .orderBy(desc(downloadableContents.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});
