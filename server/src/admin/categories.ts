import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { downloadableCategories } from "../db/schema.js";
import { idParamsSchema } from "../http/schemas.js";
import { validateBody, validateParams } from "../http/validation.js";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const adminCategoriesRouter = Router();

adminCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await getDb()
      .select()
      .from(downloadableCategories)
      .orderBy(desc(downloadableCategories.createdAt));

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminCategoriesRouter.post("/", validateBody(createCategorySchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(downloadableCategories)
      .values(req.body as z.infer<typeof createCategorySchema>)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminCategoriesRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(createCategorySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })),
  async (req, res, next) => {
    try {
      const [item] = await getDb()
        .update(downloadableCategories)
        .set({
          ...(req.body as Partial<z.infer<typeof createCategorySchema>>),
          updatedAt: new Date(),
        })
        .where(eq(downloadableCategories.id, req.params.id))
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
