export interface MercadoPagoPreferenceRequest {
  bookingBatchId: string;
  title: string;
  amount: number;
  payer?: {
    name?: string | null;
    email?: string | null;
  };
}

export interface MercadoPagoPreferenceResult {
  id: string | null;
  initPoint: string | null;
  sandboxInitPoint: string | null;
  configured: boolean;
}

export interface MercadoPagoPaymentResult {
  id: string;
  status: string;
  externalReference: string | null;
  amount: number | null;
  dateApproved: string | null;
  raw: Record<string, unknown>;
}

function getAccessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || "";
}

export function isMercadoPagoConfigured() {
  return Boolean(getAccessToken());
}

function publicApiUrl(path: string) {
  const baseUrl = process.env.SITE_PUBLIC_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : undefined;
}

export async function createMercadoPagoPreference(input: MercadoPagoPreferenceRequest): Promise<MercadoPagoPreferenceResult> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return {
      id: null,
      initPoint: null,
      sandboxInitPoint: null,
      configured: false,
    };
  }

  const notificationUrl = publicApiUrl("/api/payments/mercadopago/webhook");
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: input.amount,
        },
      ],
      payer: input.payer,
      external_reference: input.bookingBatchId,
      back_urls: {
        success: process.env.MERCADOPAGO_SUCCESS_URL,
        failure: process.env.MERCADOPAGO_FAILURE_URL,
        pending: process.env.MERCADOPAGO_PENDING_URL,
      },
      notification_url: notificationUrl,
      auto_return: "approved",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`MERCADOPAGO_PREFERENCE_ERROR:${details}`);
  }

  const data = (await response.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };

  return {
    id: data.id ?? null,
    initPoint: data.init_point ?? null,
    sandboxInitPoint: data.sandbox_init_point ?? null,
    configured: true,
  };
}

export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentResult> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("MERCADOPAGO_NOT_CONFIGURED");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`MERCADOPAGO_PAYMENT_ERROR:${details}`);
  }

  const data = (await response.json()) as Record<string, unknown>;

  return {
    id: String(data.id ?? paymentId),
    status: String(data.status ?? "pending"),
    externalReference: typeof data.external_reference === "string" ? data.external_reference : null,
    amount: typeof data.transaction_amount === "number" ? data.transaction_amount : null,
    dateApproved: typeof data.date_approved === "string" ? data.date_approved : null,
    raw: data,
  };
}
