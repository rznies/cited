// Razorpay boundary — server-only. key_secret never leaves this module's callers.
// Checkout flow: createOrder → checkout.js modal → verifyPaymentSignature.
// Webhook flow: verifyWebhookSignature → mark paid (see lib/store).
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export interface OrderClient {
  orders: {
    create(opts: {
      amount: number;
      currency: string;
      receipt: string;
      notes: { domain: string };
    }): Promise<{ id: string }>;
  };
}

export interface CheckoutDeps {
  client: OrderClient;
  keyId: string;
  currency: string;
  amount: number;
}

function liveClient(keyId: string, keySecret: string): OrderClient {
  const Ctor = Razorpay as unknown as new (opts: {
    key_id: string;
    key_secret: string;
  }) => OrderClient;
  return new Ctor({ key_id: keyId, key_secret: keySecret });
}

/** Amount/currency from env. INR shows UPI + cards; USD shows cards only. */
export function getCheckoutConfig(env: {
  [key: string]: string | undefined;
}): { currency: string; amount: number } {
  const currency = env.RAZORPAY_CURRENCY ?? "INR";
  const raw = env.RAZORPAY_AMOUNT ?? "249900";
  const amount = Number(raw);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("RAZORPAY_AMOUNT must be a positive integer");
  return { currency, amount };
}

/** Live deps from env — throws when keys are absent (dev must use test keys). */
export function liveDeps(
  env: { [key: string]: string | undefined } = process.env,
): CheckoutDeps {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET missing");
  const { currency, amount } = getCheckoutConfig(env);
  return { client: liveClient(keyId, keySecret), keyId, currency, amount };
}

/** Creates a one-time order for the domain; returns the Razorpay order id. */
export async function createOrder(deps: CheckoutDeps, domain: string): Promise<string> {
  const order = await deps.client.orders.create({
    amount: deps.amount,
    currency: deps.currency,
    receipt: `cited-${domain}-${Date.now()}`,
    notes: { domain },
  });
  return order.id;
}

function hmacHex(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout callback contract: HMAC-SHA256(`${orderId}|${paymentId}`). */
export function verifyPaymentSignature(
  params: { orderId: string; paymentId: string; signature: string },
  secret: string,
): boolean {
  if (!params.orderId || !params.paymentId || !params.signature || !secret) return false;
  return safeEqual(hmacHex(`${params.orderId}|${params.paymentId}`, secret), params.signature);
}

/** Webhook contract: HMAC-SHA256(rawBody), header x-razorpay-signature. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false;
  return safeEqual(hmacHex(rawBody, secret), signature);
}
