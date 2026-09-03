import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { markPaid } from "@/lib/store";

interface CapturedEvent {
  event?: unknown;
  payload?: { payment?: { entity?: { notes?: { domain?: unknown } } } };
}

/**
 * Razorpay webhook reconciliation: payment.captured marks the domain paid even
 * when the buyer closed the browser mid-payment. Signature over the RAW body.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  let event: CapturedEvent;
  try {
    event = JSON.parse(raw) as CapturedEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (event.event === "payment.captured") {
    const domain = event.payload?.payment?.entity?.notes?.domain;
    if (typeof domain === "string" && domain !== "") await markPaid(domain.trim().toLowerCase());
  }
  return NextResponse.json({ ok: true });
}
