import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { bookingFilterOptions } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const optionKindSchema = z.enum(["level", "year", "track"]);

const optionSchema = z.object({
  kind: optionKindSchema,
  label: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().optional().nullable().transform((value) => value ?? null),
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const updateOptionSchema = optionSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  kind: optionKindSchema.optional(),
  parentId: z.string().uuid().optional(),
  isVisible: booleanQuerySchema,
});

export const adminBookingFilterOptionsRouter = Router();

async function parentExists(parentId: string | null | undefined) {
  if (!parentId) {
    return true;
  }

  const [item] = await getDb()
    .select({ id: bookingFilterOptions.id })
    .from(bookingFilterOptions)
    .where(eq(bookingFilterOptions.id, parentId))
    .limit(1);

  return Boolean(item);
}

adminBookingFilterOptionsRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, kind, parentId, isVisible } = req.query as unknown as z.infer<typeof querySchema>;
    const conditions = [];

    if (kind) {
      conditions.push(eq(bookingFilterOptions.kind, kind));
    }

    if (parentId) {
      conditions.push(eq(bookingFilterOptions.parentId, parentId));
    }

    if (isVisible !== undefined) {
      conditions.push(eq(bookingFilterOptions.isVisible, isVisible));
    }

    const items = await getDb()
      .select()
      .from(bookingFilterOptions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(bookingFilterOptions.kind), asc(bookingFilterOptions.displayOrder), asc(bookingFilterOptions.label))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminBookingFilterOptionsRouter.post("/", validateBody(optionSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof optionSchema>;

    if (!(await parentExists(body.parentId))) {
      return res.status(400).json({ error: "PARENT_NOT_FOUND" });
    }

    const [item] = await getDb().insert(bookingFilterOptions).values(body).returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminBookingFilterOptionsRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateOptionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof updateOptionSchema>;

      if (!(await parentExists(body.parentId))) {
        return res.status(400).json({ error: "PARENT_NOT_FOUND" });
      }

      const [item] = await getDb()
        .update(bookingFilterOptions)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(bookingFilterOptions.id, req.params.id))
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

adminBookingFilterOptionsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(bookingFilterOptions)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(bookingFilterOptions.id, req.params.id))
      .returning({ id: bookingFilterOptions.id, isVisible: bookingFilterOptions.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
