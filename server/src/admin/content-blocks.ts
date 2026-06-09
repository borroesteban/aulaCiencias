import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { contentBlocks } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema, nullableTextSchema, urlSchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const contentBlockSchema = z.object({
  key: z.string().trim().min(1).max(180).regex(/^[a-z0-9.-]+$/),
  title: nullableTextSchema,
  eyebrow: nullableTextSchema,
  body: nullableTextSchema,
  imageUrl: urlSchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const updateContentBlockSchema = contentBlockSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  isVisible: booleanQuerySchema,
});

export const adminContentBlocksRouter = Router();

adminContentBlocksRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, isVisible } = req.query as unknown as z.infer<typeof querySchema>;
    const items = await getDb()
      .select()
      .from(contentBlocks)
      .where(isVisible === undefined ? undefined : eq(contentBlocks.isVisible, isVisible))
      .orderBy(asc(contentBlocks.displayOrder), asc(contentBlocks.key))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminContentBlocksRouter.post("/", validateBody(contentBlockSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(contentBlocks)
      .values(req.body as z.infer<typeof contentBlockSchema>)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminContentBlocksRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateContentBlockSchema),
  async (req, res, next) => {
    try {
      const [item] = await getDb()
        .update(contentBlocks)
        .set({ ...(req.body as z.infer<typeof updateContentBlockSchema>), updatedAt: new Date() })
        .where(eq(contentBlocks.id, req.params.id))
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

adminContentBlocksRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(contentBlocks)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(contentBlocks.id, req.params.id))
      .returning({ id: contentBlocks.id, isVisible: contentBlocks.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
