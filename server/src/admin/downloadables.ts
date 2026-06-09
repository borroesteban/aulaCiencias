import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { downloadableCategories, downloadableContents } from "../db/schema.js";
import {
  booleanQuerySchema,
  idParamsSchema,
  listQuerySchema,
  nullableTextSchema,
  urlSchema,
} from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const downloadablesQuerySchema = listQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  isVisible: booleanQuerySchema,
});

const createDownloadableSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: nullableTextSchema,
  imageUrl: urlSchema,
  categoryId: z.string().uuid(),
  isFeatured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

const updateDownloadableSchema = createDownloadableSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const adminDownloadablesRouter = Router();

const adminDownloadableFields = {
  id: downloadableContents.id,
  title: downloadableContents.title,
  description: downloadableContents.description,
  imageUrl: downloadableContents.imageUrl,
  categoryId: downloadableContents.categoryId,
  categoryName: downloadableCategories.name,
  categorySlug: downloadableCategories.slug,
  isFeatured: downloadableContents.isFeatured,
  isVisible: downloadableContents.isVisible,
  createdAt: downloadableContents.createdAt,
  updatedAt: downloadableContents.updatedAt,
};

async function assertCategoryExists(categoryId: string) {
  const [category] = await getDb()
    .select({ id: downloadableCategories.id })
    .from(downloadableCategories)
    .where(eq(downloadableCategories.id, categoryId))
    .limit(1);

  return Boolean(category);
}

adminDownloadablesRouter.get("/", validateQuery(downloadablesQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, categoryId, isVisible } = req.query as unknown as z.infer<
      typeof downloadablesQuerySchema
    >;
    const conditions = [];

    if (categoryId) {
      conditions.push(eq(downloadableContents.categoryId, categoryId));
    }

    if (isVisible !== undefined) {
      conditions.push(eq(downloadableContents.isVisible, isVisible));
    }

    const items = await getDb()
      .select(adminDownloadableFields)
      .from(downloadableContents)
      .innerJoin(
        downloadableCategories,
        eq(downloadableContents.categoryId, downloadableCategories.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(downloadableContents.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminDownloadablesRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .select(adminDownloadableFields)
      .from(downloadableContents)
      .innerJoin(
        downloadableCategories,
        eq(downloadableContents.categoryId, downloadableCategories.id),
      )
      .where(eq(downloadableContents.id, req.params.id))
      .limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminDownloadablesRouter.post("/", validateBody(createDownloadableSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createDownloadableSchema>;

    if (!(await assertCategoryExists(body.categoryId))) {
      return res.status(400).json({ error: "CATEGORY_NOT_FOUND" });
    }

    const [item] = await getDb()
      .insert(downloadableContents)
      .values(body)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminDownloadablesRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateDownloadableSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof updateDownloadableSchema>;

      if (body.categoryId && !(await assertCategoryExists(body.categoryId))) {
        return res.status(400).json({ error: "CATEGORY_NOT_FOUND" });
      }

      const [item] = await getDb()
        .update(downloadableContents)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(downloadableContents.id, req.params.id))
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

adminDownloadablesRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(downloadableContents)
      .set({
        isVisible: false,
        updatedAt: new Date(),
      })
      .where(eq(downloadableContents.id, req.params.id))
      .returning({ id: downloadableContents.id, isVisible: downloadableContents.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
