import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { validateBody, validateParams } from "../http/validation.js";
import { createPaymentPreferenceForBatch, confirmMercadoPagoPayment, getPaymentStatusForBatch } from "./service.js";

const batchParamsSchema = z.object({
  bookingBatchId: z.string().uuid(),
});

const preferenceSchema = z.object({
  bookingBatchId: z.string().uuid(),
});

function readWebhookPaymentId(body: unknown, query: Record<string, unknown>) {
  const payload = body as { data?: { id?: unknown }; id?: unknown; type?: unknown; topic?: unknown };
  return String(payload?.data?.id ?? payload?.id ?? query["data.id"] ?? query.id ?? "");
}

function readWebhookType(body: unknown, query: Record<string, unknown>) {
  const payload = body as { type?: unknown; topic?: unknown };
  return String(payload?.type ?? payload?.topic ?? query.type ?? query.topic ?? "");
}

export const paymentsRouter = Router();

paymentsRouter.post("/mercadopago/preference", validateBody(preferenceSchema), async (req, res, next) => {
  try {
    const preference = await createPaymentPreferenceForBatch(getDb(), req.body.bookingBatchId);
    return res.status(201).json(preference);
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_BATCH_NOT_FOUND") {
      return res.status(404).json({ error: "BOOKING_BATCH_NOT_FOUND" });
    }

    return next(error);
  }
});

paymentsRouter.post("/mercadopago/webhook", async (req, res, next) => {
  try {
    const eventType = readWebhookType(req.body, req.query as Record<string, unknown>);
    const paymentId = readWebhookPaymentId(req.body, req.query as Record<string, unknown>);

    if (eventType && !eventType.includes("payment")) {
      return res.json({ ok: true, ignored: eventType });
    }

    if (!paymentId) {
      return res.status(400).json({ error: "PAYMENT_ID_REQUIRED" });
    }

    const status = await confirmMercadoPagoPayment(getDb(), {
      paymentId,
      rawPayload: req.body as Record<string, unknown>,
    });

    return res.json({ ok: true, status });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_BATCH_NOT_FOUND") {
      return res.status(404).json({ error: "BOOKING_BATCH_NOT_FOUND" });
    }

    return next(error);
  }
});

paymentsRouter.get("/mercadopago/status/:bookingBatchId", validateParams(batchParamsSchema), async (req, res, next) => {
  try {
    const status = await getPaymentStatusForBatch(getDb(), req.params.bookingBatchId);
    return res.json(status);
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_BATCH_NOT_FOUND") {
      return res.status(404).json({ error: "BOOKING_BATCH_NOT_FOUND" });
    }

    return next(error);
  }
});
