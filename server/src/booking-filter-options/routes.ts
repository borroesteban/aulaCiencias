import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { getDb } from "../db/client.js";
import { bookingFilterOptions } from "../db/schema.js";

export const bookingFilterOptionsRouter = Router();

bookingFilterOptionsRouter.get("/", async (_req, res, next) => {
  try {
    const items = await getDb()
      .select()
      .from(bookingFilterOptions)
      .where(eq(bookingFilterOptions.isVisible, true))
      .orderBy(asc(bookingFilterOptions.kind), asc(bookingFilterOptions.displayOrder), asc(bookingFilterOptions.label));

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});
