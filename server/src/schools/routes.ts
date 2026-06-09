import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { schools } from "../db/schema.js";
import { idParamsSchema, listQuerySchema } from "../http/schemas.js";
import { validateParams, validateQuery } from "../http/validation.js";

const schoolsQuerySchema = listQuerySchema.extend({
  level: z.string().trim().min(1).max(120).optional(),
  managementType: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const schoolsRouter = Router();

const publicSchoolFields = {
  id: schools.id,
  name: schools.name,
  level: schools.level,
  managementType: schools.managementType,
  address: schools.address,
  phone: schools.phone,
  email: schools.email,
  latitude: schools.latitude,
  longitude: schools.longitude,
  mapUrl: schools.mapUrl,
  generalInfo: schools.generalInfo,
  createdAt: schools.createdAt,
  updatedAt: schools.updatedAt,
};

schoolsRouter.get("/", validateQuery(schoolsQuerySchema), async (req, res, next) => {
  try {
    const { limit, offset, level, managementType, search } = req.query as unknown as z.infer<
      typeof schoolsQuerySchema
    >;
    const conditions = [eq(schools.isVisible, true)];

    if (level) {
      conditions.push(eq(schools.level, level));
    }

    if (managementType) {
      conditions.push(eq(schools.managementType, managementType));
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
      .select(publicSchoolFields)
      .from(schools)
      .where(and(...conditions))
      .orderBy(desc(schools.createdAt))
      .limit(limit)
      .offset(offset);

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

schoolsRouter.get("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [school] = await getDb()
      .select(publicSchoolFields)
      .from(schools)
      .where(and(eq(schools.id, req.params.id), eq(schools.isVisible, true)))
      .limit(1);

    if (!school) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item: school });
  } catch (error) {
    return next(error);
  }
});
