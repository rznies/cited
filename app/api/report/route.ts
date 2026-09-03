import { NextResponse } from "next/server";
import { MOCK_DOMAIN } from "@/lib/mock";
import { generateReport } from "@/lib/seams";
import { isPaid } from "@/lib/store";

// Paid-gated report fetch: full content requires verified payment — the gate
// check lives here, not just in the HMAC verify step, so direct GETs fail too.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("domain")?.trim().toLowerCase();
  const domain = raw ? raw.slice(0, 253) : MOCK_DOMAIN;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "bad domain" }, { status: 400 });
  }
  if (!(await isPaid(domain))) {
    return NextResponse.json({ error: "payment required" }, { status: 402 });
  }
  const report = await generateReport(domain);
  return NextResponse.json({ mock: true, report });
}
