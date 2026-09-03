import { NextResponse } from "next/server";
import { cleanDomain } from "@/lib/domains";
import { infra } from "@/lib/http";
import { createOrder, liveDeps } from "@/lib/payments";
import { isPaid } from "@/lib/store";

/** Paid-state read for revisit-after-payment unlock (no secrets involved). */
export async function GET(req: Request) {
  const domain = cleanDomain(new URL(req.url).searchParams.get("domain"));
  if (!domain) return NextResponse.json({ error: "bad domain" }, { status: 400 });
  try {
    return NextResponse.json({ domain, paid: await isPaid(domain) });
  } catch {
    return infra();
  }
}

/** Creates the one-time Razorpay order. Returns public key + order (no secret). */
export async function POST(req: Request) {
  const domain = cleanDomain((await req.json().catch(() => null))?.domain);
  if (!domain) return NextResponse.json({ error: "bad domain" }, { status: 400 });
  try {
    if (await isPaid(domain)) return NextResponse.json({ domain, paid: true });
    const deps = liveDeps();
    const orderId = await createOrder(deps, domain);
    return NextResponse.json({
      domain,
      paid: false,
      orderId,
      amount: deps.amount,
      currency: deps.currency,
      keyId: deps.keyId,
    });
  } catch {
    return infra();
  }
}
