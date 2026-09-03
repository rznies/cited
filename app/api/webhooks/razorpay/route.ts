import { NextResponse } from "next/server";
import { cleanDomain } from "@/lib/domains";
import { infra } from "@/lib/http";
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
    const domain = cleanDomain(event.payload?.payment?.entity?.notes?.domain);
    if (domain === null) return NextResponse.json({ ok: false }, { status: 400 });
    try {
      await markPaid(domain);
    } catch {
      return infra();
    }
  }
  return NextResponse.json({ ok: true });
}
