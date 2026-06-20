import { Router } from "express";
import { isGoogleCalendarConfigured } from "./googleCalendar.js";

export const calendarRouter = Router();

calendarRouter.get("/status", (_req, res) => {
  res.json({
    configured: isGoogleCalendarConfigured(),
    calendarName: process.env.GOOGLE_CALENDAR_NAME ?? "AulaCsWeb",
    ownerEmail: process.env.GOOGLE_CALENDAR_OWNER_EMAIL ?? "silvina.pereyra86@gmail.com",
  });
});
