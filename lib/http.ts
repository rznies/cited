import { NextResponse } from "next/server";

/** Infra failure (no DB, no keys, provider outage) — never a bare 500. */
export function infra(): NextResponse {
  return NextResponse.json({ error: "temporarily unavailable, retry shortly" }, { status: 503 });
}
