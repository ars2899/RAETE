import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  CapturePaypalSandboxOrderParams,
  CapturePaypalSandboxOrderResponse,
  CreatePaypalSandboxOrderBody,
  CreatePaypalSandboxOrderResponse,
  SearchChannel3ProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const paypalApi = "https://api-m.sandbox.paypal.com";
const channel3Search = "https://api.trychannel3.com/v1/search";
const supportedCurrencies = new Set([
  "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF",
  "ILS", "JPY", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN", "RUB", "SEK",
  "SGD", "THB", "TWD", "USD", "CHF",
]);
const zeroDecimalCurrencies = new Set(["HUF", "JPY"]);
type SandboxTestState = {
  orderId: string;
  status: string;
  captureId?: string;
  updatedAt: string;
};
let latestSandboxTest: SandboxTestState | null = null;

function updateSandboxTest(update: Partial<SandboxTestState> & Pick<SandboxTestState, "orderId">) {
  const previous = latestSandboxTest?.orderId === update.orderId ? latestSandboxTest : undefined;
  latestSandboxTest = {
    orderId: update.orderId,
    status: update.status ?? previous?.status ?? "CREATED",
    captureId: update.captureId ?? previous?.captureId,
    updatedAt: new Date().toISOString(),
  };
}

function paypalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal Sandbox credentials are not configured.");
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const { clientId, clientSecret } = paypalCredentials();
  const response = await fetch(`${paypalApi}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`PayPal Sandbox authentication failed (HTTP ${response.status}${payload.error ? `, ${payload.error}` : ""}).`);
  }
  return payload.access_token;
}

function safePayPalAmount(product: { offers?: Array<{ price?: { price?: number; amount?: number; currency?: string } }> }) {
  const offer = product.offers?.find((item) => {
    const amount = item.price?.price ?? item.price?.amount;
    return typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && !!item.price?.currency;
  });
  const amount = offer?.price?.price ?? offer?.price?.amount;
  const currency = offer?.price?.currency?.toUpperCase();
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || !currency || !supportedCurrencies.has(currency)) {
    return null;
  }
  if (zeroDecimalCurrencies.has(currency)) {
    return Number.isInteger(amount) ? { amount: String(amount), currency } : null;
  }
  if (Math.round(amount * 100) !== amount * 100) return null;
  return { amount: amount.toFixed(2), currency };
}

router.get("/paypal/config", (_req, res): void => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId || !process.env.PAYPAL_CLIENT_SECRET) {
    res.status(503).json({ error: "PayPal Sandbox is not configured." });
    return;
  }
  res.json({ clientId });
});

// Temporary Sandbox-only observability; state resets when the API process restarts.
router.get("/paypal/sandbox-test-status", (_req, res): void => {
  res.json({ latest: latestSandboxTest });
});

router.post("/paypal/orders", async (req, res): Promise<void> => {
  const parsed = CreatePaypalSandboxOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Sandbox order request." });
    return;
  }
  const channel3Key = process.env.CHANNEL3_API_KEY;
  if (!channel3Key) {
    res.status(503).json({ error: "Live product pricing is unavailable." });
    return;
  }
  try {
    const productResponse = await fetch(channel3Search, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": channel3Key },
      body: JSON.stringify({ query: parsed.data.query, limit: 8 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!productResponse.ok) throw new Error("Channel3 could not verify the live product.");
    const payload = await productResponse.json() as unknown;
    const products = SearchChannel3ProductsResponse.safeParse(payload);
    if (!products.success) throw new Error("Channel3 returned invalid product data.");
    const product = products.data.products.find((item) => item.id === parsed.data.productId);
    const amount = product && safePayPalAmount(product);
    if (!product || !amount) {
      res.status(422).json({ error: "No safe, supported live price is available for this product." });
      return;
    }

    const accessToken = await getAccessToken();
    const orderResponse = await fetch(`${paypalApi}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: product.id,
          custom_id: "RAETE_SANDBOX_DEMO",
          description: `RAETE Sandbox demo: ${product.title}`.slice(0, 127),
          amount: { currency_code: amount.currency, value: amount.amount },
        }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const order = await orderResponse.json() as { id?: string; status?: string };
    if (!orderResponse.ok || !order.id) {
      req.log.warn({ statusCode: orderResponse.status }, "PayPal Sandbox order creation failed");
      res.status(502).json({ error: "PayPal Sandbox could not create the order." });
      return;
    }
    updateSandboxTest({ orderId: order.id, status: order.status ?? "CREATED" });
    req.log.info({ orderId: order.id, paypalStatus: order.status ?? "CREATED" }, "PayPal Sandbox order created");
    res.json(CreatePaypalSandboxOrderResponse.parse({ orderId: order.id }));
  } catch (error) {
    req.log.warn("PayPal Sandbox order creation failed");
    res.status(502).json({ error: "PayPal Sandbox checkout is unavailable." });
  }
});

router.post("/paypal/orders/:orderId/capture", async (req, res): Promise<void> => {
  const params = CapturePaypalSandboxOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid PayPal Sandbox order ID." });
    return;
  }
  try {
    const accessToken = await getAccessToken();
    const orderResponse = await fetch(`${paypalApi}/v2/checkout/orders/${encodeURIComponent(params.data.orderId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const order = await orderResponse.json() as {
      status?: string;
      purchase_units?: Array<{ custom_id?: string }>;
    };
    if (!orderResponse.ok || !order.purchase_units?.some((unit) => unit.custom_id === "RAETE_SANDBOX_DEMO")) {
      res.status(400).json({ error: "This is not a RAETE Sandbox demo order." });
      return;
    }
    if (order.status === "APPROVED") {
      updateSandboxTest({ orderId: params.data.orderId, status: "APPROVED" });
      req.log.info({ orderId: params.data.orderId }, "PayPal Sandbox approval returned");
    }
    updateSandboxTest({ orderId: params.data.orderId, status: "CAPTURE_ATTEMPTED" });
    req.log.info({ orderId: params.data.orderId, paypalStatus: "CAPTURE_ATTEMPTED" }, "PayPal Sandbox capture attempted");
    const captureResponse = await fetch(`${paypalApi}/v2/checkout/orders/${encodeURIComponent(params.data.orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": randomUUID(),
      },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    const captured = await captureResponse.json() as {
      status?: string;
      purchase_units?: Array<{
        payments?: { captures?: Array<{ id?: string; status?: string; amount?: { value?: string; currency_code?: string } }> };
      }>;
    };
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    const finalStatus = capture?.status ?? captured.status ?? `HTTP_${captureResponse.status}`;
    req.log.info({ orderId: params.data.orderId, paypalStatus: finalStatus }, "PayPal Sandbox capture result");
    if (!captureResponse.ok || capture?.status !== "COMPLETED" || !capture.id || !capture.amount?.value || !capture.amount.currency_code) {
      updateSandboxTest({ orderId: params.data.orderId, status: finalStatus });
      req.log.warn({ orderId: params.data.orderId, paypalStatus: finalStatus }, "PayPal Sandbox capture did not complete");
      res.status(502).json({ error: "PayPal Sandbox could not confirm the capture." });
      return;
    }
    updateSandboxTest({ orderId: params.data.orderId, status: "COMPLETED", captureId: capture.id });
    req.log.info({ orderId: params.data.orderId, captureId: capture.id, paypalStatus: "COMPLETED" }, "PayPal Sandbox capture completed");
    res.json(CapturePaypalSandboxOrderResponse.parse({
      status: "COMPLETED",
      captureId: capture.id,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
    }));
  } catch (error) {
    updateSandboxTest({ orderId: params.data.orderId, status: "CAPTURE_ERROR" });
    req.log.warn({ orderId: params.data.orderId, paypalStatus: "CAPTURE_ERROR" }, "PayPal Sandbox capture failed");
    res.status(502).json({ error: "PayPal Sandbox capture is unavailable." });
  }
});

export default router;
