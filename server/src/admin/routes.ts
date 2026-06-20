import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { adminBookingFilterOptionsRouter } from "./booking-filter-options.js";
import { adminBookingTimeSlotsRouter } from "./booking-time-slots.js";
import { adminBookingsRouter } from "./bookings.js";
import { adminCategoriesRouter } from "./categories.js";
import { adminContentBlocksRouter } from "./content-blocks.js";
import { adminDownloadablesRouter } from "./downloadables.js";
import { adminGuardiansRouter } from "./guardians.js";
import { adminSchoolsRouter } from "./schools.js";
import { adminSettingsRouter } from "./settings.js";
import { adminStudentsRouter } from "./students.js";
import { adminSubjectHighlightsRouter } from "./subject-highlights.js";
import { adminSubjectsRouter } from "./subjects.js";
import { adminTopicsRouter } from "./topics.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["SUPERADMIN", "ADMIN"]));

adminRouter.get("/health", (_req, res) => {
  res.json({ ok: true, area: "admin" });
});

adminRouter.use("/downloadables", adminDownloadablesRouter);
adminRouter.use("/downloadable-categories", adminCategoriesRouter);
adminRouter.use("/topics", adminTopicsRouter);
adminRouter.use("/subjects", adminSubjectsRouter);
adminRouter.use("/subject-highlights", adminSubjectHighlightsRouter);
adminRouter.use("/booking-filter-options", adminBookingFilterOptionsRouter);
adminRouter.use("/booking-time-slots", adminBookingTimeSlotsRouter);
adminRouter.use("/content-blocks", adminContentBlocksRouter);
adminRouter.use("/schools", adminSchoolsRouter);
adminRouter.use("/students", adminStudentsRouter);
adminRouter.use("/guardians", adminGuardiansRouter);
adminRouter.use("/bookings", adminBookingsRouter);
adminRouter.use("/settings", adminSettingsRouter);
