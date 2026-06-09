import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { bookingTimeSlots } from "../db/schema.js";
import { booleanQuerySchema, idParamsSchema, listQuerySchema } from "../http/schemas.js";
import { validateBody, validateParams, validateQuery } from "../http/validation.js";

const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform((value) => (value.length === 5 ? `${value}:00` : value));

const slotSchema = z.object({
  startTime: timeSchema,
  label: z.string().trim().min(1).max(40),
  displayOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const updateSlotSchema = slotSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const querySchema = listQuerySchema.extend({
  isVisible: booleanQuerySchema,
});

export const adminBookingTimeSlotsRouter = Router();

function formatSlot<T extends { startTime: string }>(slot: T) {
  return { ...slot, startTime: slot.startTime.slice(0, 5) };
}

adminBookingTimeSlotsRouter.get("/", validateQuery(querySchema), async (req, res, next) => {
  try {
    const { limit, offset, isVisible } = req.query as unknown as z.infer<typeof querySchema>;
    const rows = await getDb()
      .select()
      .from(bookingTimeSlots)
      .where(isVisible === undefined ? undefined : eq(bookingTimeSlots.isVisible, isVisible))
      .orderBy(asc(bookingTimeSlots.displayOrder), asc(bookingTimeSlots.startTime))
      .limit(limit)
      .offset(offset);

    return res.json({ items: rows.map(formatSlot) });
  } catch (error) {
    return next(error);
  }
});

adminBookingTimeSlotsRouter.post("/", validateBody(slotSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .insert(bookingTimeSlots)
      .values(req.body as z.infer<typeof slotSchema>)
      .returning();

    return res.status(201).json({ item: formatSlot(item) });
  } catch (error) {
    return next(error);
  }
});

adminBookingTimeSlotsRouter.patch("/:id", validateParams(idParamsSchema), validateBody(updateSlotSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(bookingTimeSlots)
      .set({ ...(req.body as z.infer<typeof updateSlotSchema>), updatedAt: new Date() })
      .where(eq(bookingTimeSlots.id, req.params.id))
      .returning();

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item: formatSlot(item) });
  } catch (error) {
    return next(error);
  }
});

adminBookingTimeSlotsRouter.delete("/:id", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const [item] = await getDb()
      .update(bookingTimeSlots)
      .set({ isVisible: false, updatedAt: new Date() })
      .where(eq(bookingTimeSlots.id, req.params.id))
      .returning({ id: bookingTimeSlots.id, isVisible: bookingTimeSlots.isVisible });

    if (!item) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    return res.json({ item });
  } catch (error) {
    return next(error);
  }
});
