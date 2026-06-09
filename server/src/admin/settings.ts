import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { appSettings } from "../db/schema.js";
import { nullableTextSchema, numericStringSchema, shortNullableTextSchema } from "../http/schemas.js";
import { validateBody } from "../http/validation.js";

const updateSettingsSchema = z.object({
  pricePerHour: numericStringSchema,
  topicsPerHour: z.number().int().positive().max(50),
  maxStudentsPerSlot: z.number().int().positive().max(50),
  mercadoPagoAlias: shortNullableTextSchema,
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  heroImageUrl: nullableTextSchema,
  backgroundImageUrl: nullableTextSchema,
  faviconUrl: nullableTextSchema,
  carouselImages: nullableTextSchema,
  subjectWindowIntervalSeconds: z.number().int().min(1).max(50),
  subjectWindowItems: nullableTextSchema,
  whatsappNumber: shortNullableTextSchema,
  siteTitle: z.string().trim().min(1).max(160),
  heroEyebrow: z.string().trim().min(1).max(160),
  heroTitle: z.string().trim().min(1).max(240),
  heroSubtitle: z.string().trim().max(700),
});

export const adminSettingsRouter = Router();

adminSettingsRouter.get("/", async (_req, res, next) => {
  try {
    const [settings] = await getDb().select().from(appSettings).limit(1);

    if (!settings) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
});

adminSettingsRouter.patch("/", validateBody(updateSettingsSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof updateSettingsSchema>;
    const [existing] = await getDb().select({ id: appSettings.id }).from(appSettings).limit(1);

    if (!existing) {
      const [settings] = await getDb()
        .insert(appSettings)
        .values({
          ...body,
          pricePerHour: body.pricePerHour ?? "0",
        })
        .returning();

      return res.status(201).json({ settings });
    }

    const [settings] = await getDb()
      .update(appSettings)
      .set({
        ...body,
        pricePerHour: body.pricePerHour ?? "0",
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing.id))
      .returning();

    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
});
