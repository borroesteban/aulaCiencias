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
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  heroImageUrl: nullableTextSchema,
  backgroundImageUrl: nullableTextSchema,
  faviconUrl: nullableTextSchema,
  carouselImages: nullableTextSchema,
  educationalBackgroundImages: nullableTextSchema,
  subjectWindowIntervalSeconds: z.number().int().min(1).max(20),
  subjectWindowRotationSeconds: z.number().min(0.5).max(20),
  subjectWindowPauseSeconds: z.number().min(0).max(20),
  subjectWindowSizeValue: z.number().min(1).max(500),
  subjectWindowSizeUnit: z.enum(["px", "cm"]),
  subjectWindowItems: nullableTextSchema,
  whatsappNumber: shortNullableTextSchema,
  siteTitle: z.string().trim().min(1).max(160),
  heroEyebrow: z.string().trim().min(1).max(160),
  heroTitle: z.string().trim().min(1).max(240),
  heroSubtitle: z.string().trim().max(700),
});

export const adminSettingsRouter = Router();

function serializeSettings<T extends Record<string, unknown>>(settings: T) {
  return {
    ...settings,
    subjectWindowRotationSeconds: Number(settings.subjectWindowRotationSeconds ?? 1),
    subjectWindowPauseSeconds: Number(settings.subjectWindowPauseSeconds ?? 2),
    subjectWindowSizeValue: Number(settings.subjectWindowSizeValue ?? 140),
    subjectWindowSizeUnit: settings.subjectWindowSizeUnit ?? "px",
  };
}

function settingsPayload(body: z.infer<typeof updateSettingsSchema>) {
  return {
    ...body,
    pricePerHour: body.pricePerHour ?? "0",
    subjectWindowRotationSeconds: String(body.subjectWindowRotationSeconds),
    subjectWindowPauseSeconds: String(body.subjectWindowPauseSeconds),
    subjectWindowSizeValue: String(body.subjectWindowSizeValue),
  };
}

adminSettingsRouter.get("/", async (_req, res, next) => {
  try {
    const [settings] = await getDb().select().from(appSettings).limit(1);

    if (!settings) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ settings: serializeSettings(settings) });
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
          ...settingsPayload(body),
        })
        .returning();

      return res.status(201).json({ settings: serializeSettings(settings) });
    }

    const [settings] = await getDb()
      .update(appSettings)
      .set({
        ...settingsPayload(body),
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing.id))
      .returning();

    return res.json({ settings: serializeSettings(settings) });
  } catch (error) {
    return next(error);
  }
});
