import { NextResponse } from "next/server";
import { cleanDomain } from "@/lib/domains";
import { infra } from "@/lib/http";
import { newShareToken } from "@/lib/share";
import { isPaid, mintShareToken, getReport } from "@/lib/store";

/** Mints (or reuses) the buyer-shareable paid link — paid domains only. */
export async function POST(req: Request) {
  const domain = cleanDomain((await req.json().catch(() => null))?.domain);
  if (!domain) return NextResponse.json({ error: "bad domain" }, { status: 400 });
  try {
    if (!(await isPaid(domain))) return NextResponse.json({ error: "payment required" }, { status: 402 });
    const existing = await getReport(domain);
    const token = existing?.shareToken ?? newShareToken();
    if (!existing?.shareToken) await mintShareToken(domain, token);
    return NextResponse.json({ domain, token, url: `/s/${token}` });
  } catch {
    return infra();
  }
}
