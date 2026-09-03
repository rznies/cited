import { NextResponse } from "next/server";
import { MOCK_DOMAIN } from "@/lib/mock";
import { generateReport } from "@/lib/seams";

// MOCK endpoint (Ticket 3a replaces with gated fetch): serves the canned
// report AFTER the gate toggle so paid content is never in the page payload.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("domain")?.trim();
  const domain = raw ? raw.slice(0, 253) : MOCK_DOMAIN;
  const report = await generateReport(domain);
  return NextResponse.json({ mock: true, report });
}
