import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { schools } from "../db/schema.js";
import {
  booleanQuerySchema,
  idParamsSchema,
  listQuerySchema,
  nullableTextSchema,
  numericStringSchema,
  shortNullableTextSchema,
  urlSchema,
} from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const schoolsQuerySchema = listQuerySchema.extend({
  level: z.string().trim().min(1).max(120).optional(),
  managementType: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  isVisible: booleanQuerySchema,
});

const createSchoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  level: shortNullableTextSchema,
  managementType: shortNullableTextSchema,
  address: shortNullableTextSchema,
  phone: shortNullableTextSchema,
  email: z.string().trim().email().max(320).optional().nullable(),
  latitude: numericStringSchema,
  longitude: numericStringSchema,
  mapUrl: urlSchema,
  generalInfo: nullableTextSchema,
  isVisible: z.boolean().default(true),
});

const updateSchoolSchema = createSchoolSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const adminSchoolsRouter = Router();

adminSchoolsRouter.get("/", validateQuery(schoolsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, level, managementType, search, isVisible } = req.query as unknown as z.infer<
      typeof schoolsQuerySchema
    >;
    const conditions = [];

    if (level) {
      conditions.push(eq(schools.level, level));
    }

    if (managementType) {
      conditions.push(eq(schools.managementType, managementType));
    }

    if (isVisible !== undefined) {
      conditions.push(eq(schools.isVisible, isVisible));
    }

    if (search) {
      const likeSearch = `%${search}%`;
      const searchCondition = or(
        ilike(schools.name, likeSearch),
        ilike(schools.address, likeSearch),
        ilike(schools.generalInfo, likeSearch),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const items = await getDb()
      .select()
      .from(schools)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schools.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

adminSchoolsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb().select().from(schools).where(eq(schools.id, req.params.id)).limit(1);

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSchoolsRouter.post("/", validateBody(createSchoolSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(schools)
      .values(req.body as z.infer<typeof createSchoolSchema>)
      .returning();

    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

adminSchoolsRouter.patch(
  "/:id",
  validateParams(idParamsSchema),
  validateBody(updateSchoolSchema),
  async (req, res, next) => {
    try {
      const [item] = await getDb()
        .update(schools)
        .set({
          ...(req.body as z.infer<typeof updateSchoolSchema>),
          updatedAt: new Date(),
        })
        .where(eq(schools.id, req.params.id))
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

adminSchoolsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(schools)
      .set({
        isVisible: false,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, req.params.id))
      .returning({ id: schools.id, isVisible: schools.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
