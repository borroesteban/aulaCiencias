import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { getDb } from "../db/client.js";
import { bookingTimeSlots } from "../db/schema.js";

export const bookingTimeSlotsRouter = Router();

function timeForResponse(value: string) {
  return value.slice(0, 5);
}

bookingTimeSlotsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select({
        id: bookingTimeSlots.id,
        startTime: bookingTimeSlots.startTime,
        label: bookingTimeSlots.label,
        displayOrder: bookingTimeSlots.displayOrder,
      })
      .from(bookingTimeSlots)
      .where(eq(bookingTimeSlots.isVisible, true))
      .orderBy(asc(bookingTimeSlots.displayOrder), asc(bookingTimeSlots.startTime));

    return res.json({
      items: rows.map((row) => ({
        ...row,
        startTime: timeForResponse(row.startTime),
        label: row.label || timeForResponse(row.startTime),
      })),
    });
  } catch (error) {
    return next(error);
  }
});
