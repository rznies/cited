import { NextResponse } from "next/server";
import { cleanDomain } from "@/lib/domains";
import { MAX_PASTE } from "@/lib/paste";
import { scorePaste } from "@/lib/seams";

/**
 * Paste scoring — stateless by design: no store import, no rows written.
 * localStorage on the client is the only persistence (spec story 17).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    text?: unknown;
    domain?: unknown;
  } | null;
  const domain = cleanDomain(body?.domain);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!domain) return NextResponse.json({ error: "bad domain" }, { status: 400 });
  if (text.trim() === "") return NextResponse.json({ error: "empty paste" }, { status: 400 });
  if (text.length > MAX_PASTE) return NextResponse.json({ error: "paste too long" }, { status: 400 });
  return NextResponse.json({ domain, result: await scorePaste(text, domain) });
}
