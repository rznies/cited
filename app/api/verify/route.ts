import { NextResponse } from "next/server";
import { cleanDomain } from "@/lib/domains";
import { infra } from "@/lib/http";
import { verifyPaymentSignature } from "@/lib/payments";
import { markPaid } from "@/lib/store";

/**
 * Client callback confirmation. Unlocks ONLY on valid HMAC signature —
 * the checkout.js handler alone never unlocks.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      domain?: unknown;
      orderId?: unknown;
      paymentId?: unknown;
      signature?: unknown;
    } | null;
    const domain = cleanDomain(body?.domain);
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const ok =
      domain !== null &&
      verifyPaymentSignature(
        {
          orderId: typeof body?.orderId === "string" ? body.orderId : "",
          paymentId: typeof body?.paymentId === "string" ? body.paymentId : "",
          signature: typeof body?.signature === "string" ? body.signature : "",
        },
        secret,
      );
    if (!ok) return NextResponse.json({ ok: false }, { status: 400 });
    await markPaid(domain);
    return NextResponse.json({ ok: true });
  } catch {
    return infra();
  }
}
