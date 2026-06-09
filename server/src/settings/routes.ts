import { Router } from "express";
import { getDb } from "../db/client.js";
import { appSettings } from "../db/schema.js";

export const settingsRouter = Router();

settingsRouter.get("/public", async (_req, res, next) => {
  try {
    const [settings] = await getDb().select().from(appSettings).limit(1);

    return res.json({
      settings: {
        pricePerHour: settings?.pricePerHour ?? "0",
        topicsPerHour: settings?.topicsPerHour ?? 1,
        maxStudentsPerSlot: settings?.maxStudentsPerSlot ?? 1,
        mercadoPagoAlias: settings?.mercadoPagoAlias ?? null,
        primaryColor: settings?.primaryColor ?? "#000000",
        secondaryColor: settings?.secondaryColor ?? "#000000",
        accentColor: settings?.accentColor ?? "#000000",
        heroImageUrl: settings?.heroImageUrl ?? null,
        backgroundImageUrl: settings?.backgroundImageUrl ?? null,
        faviconUrl: settings?.faviconUrl ?? null,
        carouselImages: settings?.carouselImages ?? null,
        educationalBackgroundImages: settings?.educationalBackgroundImages ?? null,
        subjectWindowIntervalSeconds: settings?.subjectWindowIntervalSeconds ?? 3,
        subjectWindowRotationSeconds: Number(settings?.subjectWindowRotationSeconds ?? 1),
        subjectWindowPauseSeconds: Number(settings?.subjectWindowPauseSeconds ?? 2),
        subjectWindowSizeValue: Number(settings?.subjectWindowSizeValue ?? 140),
        subjectWindowSizeUnit: settings?.subjectWindowSizeUnit ?? "px",
        subjectWindowItems: settings?.subjectWindowItems ?? null,
        whatsappNumber: settings?.whatsappNumber ?? "",
        siteTitle: settings?.siteTitle ?? "",
        heroEyebrow: settings?.heroEyebrow ?? "",
        heroTitle: settings?.heroTitle ?? "",
        heroSubtitle: settings?.heroSubtitle ?? null,
      },
    });
  } catch (error) {
    return next(error);
  }
});
