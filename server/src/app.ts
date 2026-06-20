import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminRouter } from "./admin/routes.js";
import { authRouter } from "./auth/routes.js";
import { bookingFilterOptionsRouter } from "./booking-filter-options/routes.js";
import { bookingTimeSlotsRouter } from "./booking-time-slots/routes.js";
import { bookingsRouter } from "./bookings/routes.js";
import { calendarRouter } from "./calendar/routes.js";
import { contentBlocksRouter } from "./content-blocks/routes.js";
import { downloadablesRouter } from "./downloadables/routes.js";
import { errorHandler } from "./http/error-handler.js";
import { glossaryRouter } from "./glossary/routes.js";
import { mapRouter } from "./map/routes.js";
import { paymentsRouter } from "./payments/routes.js";
import { schoolsRouter } from "./schools/routes.js";
import { settingsRouter } from "./settings/routes.js";
import { studentsRouter } from "./students/routes.js";
import { studyRouter } from "./study/routes.js";
import { subjectHighlightsRouter } from "./subject-highlights/routes.js";
import { subjectsRouter } from "./subjects/routes.js";
import { topicsRouter } from "./topics/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(express.json());
  app.use(cookieParser());

  if (process.env.NODE_ENV !== "production") {
    app.use(
      cors({
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
        credentials: true,
      }),
    );
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api", bookingsRouter);
  app.use("/api/downloadables", downloadablesRouter);
  app.use("/api/topics", topicsRouter);
  app.use("/api/subjects", subjectsRouter);
  app.use("/api/subject-highlights", subjectHighlightsRouter);
  app.use("/api/booking-filter-options", bookingFilterOptionsRouter);
  app.use("/api/booking-time-slots", bookingTimeSlotsRouter);
  app.use("/api/content-blocks", contentBlocksRouter);
  app.use("/api/schools", schoolsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/students", studentsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/glossary", glossaryRouter);
  app.use("/api/study", studyRouter);
  app.use("/api/map", mapRouter);
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.resolve(__dirname, "../../client/dist");

    app.use(express.static(clientDistPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
