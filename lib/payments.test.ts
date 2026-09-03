// Ticket 3a — payment boundary tests. No live calls; fake client + HMAC vectors.
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createOrder,
  getCheckoutConfig,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./payments";

const SECRET = "test_secret_123";
const ORDER = "order_RZPTEST01";
const PAYMENT = "pay_RZPTEST01";

function paymentSig(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("verifyPaymentSignature (Razorpay checkout contract)", () => {
  it("accepts a correctly constructed signature", () => {
    expect(
      verifyPaymentSignature(
        { orderId: ORDER, paymentId: PAYMENT, signature: paymentSig(ORDER, PAYMENT, SECRET) },
        SECRET,
      ),
    ).toBe(true);
  });
  it("rejects a tampered payment id", () => {
    expect(
      verifyPaymentSignature(
        { orderId: ORDER, paymentId: PAYMENT + "x", signature: paymentSig(ORDER, PAYMENT, SECRET) },
        SECRET,
      ),
    ).toBe(false);
  });
  it("rejects a tampered order id", () => {
    expect(
      verifyPaymentSignature(
        { orderId: ORDER + "x", paymentId: PAYMENT, signature: paymentSig(ORDER, PAYMENT, SECRET) },
        SECRET,
      ),
    ).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(
      verifyPaymentSignature(
        { orderId: ORDER, paymentId: PAYMENT, signature: paymentSig(ORDER, PAYMENT, SECRET) },
        "wrong",
      ),
    ).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(verifyPaymentSignature({ orderId: "", paymentId: PAYMENT, signature: "zz" }, SECRET)).toBe(
      false,
    );
  });
});

describe("verifyWebhookSignature (payment.captured contract)", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const sig = createHmac("sha256", SECRET).update(body).digest("hex");
  it("accepts the matching signature", () => {
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(body + " ", sig, SECRET)).toBe(false);
  });
});

describe("createOrder (provider boundary)", () => {
  it("passes amount/currency/receipt through and returns the order id", async () => {
    const seen: unknown[] = [];
    const fake = {
      orders: {
        create: async (opts: unknown) => {
          seen.push(opts);
          return { id: ORDER };
        },
      },
    };
    const id = await createOrder(
      { client: fake, keyId: "rzp_test_x", currency: "INR", amount: 249900 },
      "acmecrm.com",
    );
    expect(id).toBe(ORDER);
    expect(seen[0]).toMatchObject({ amount: 249900, currency: "INR" });
    expect((seen[0] as { receipt: string }).receipt).toContain("acmecrm.com");
  });
});

describe("getCheckoutConfig (env-driven price)", () => {
  it("defaults to INR 249900", () => {
    expect(getCheckoutConfig({})).toMatchObject({ currency: "INR", amount: 249900 });
  });
  it("honors env overrides", () => {
    expect(
      getCheckoutConfig({ RAZORPAY_CURRENCY: "USD", RAZORPAY_AMOUNT: "2900" }),
    ).toMatchObject({ currency: "USD", amount: 2900 });
  });
  it("rejects a non-numeric amount", () => {
    expect(() => getCheckoutConfig({ RAZORPAY_AMOUNT: "lots" })).toThrow();
  });
});
