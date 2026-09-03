import { after } from "next/server";
import { NextResponse } from "next/server";
import { pgStore } from "@/lib/dbreports";
import { cleanDomain } from "@/lib/domains";
import { infra } from "@/lib/http";
import { getReportState, runnerFor } from "@/lib/reports";
import { isPaid } from "@/lib/store";

/**
 * Paid-gated report fetch with 24h cache + polling.
 * 400 bad domain → 402 unpaid → 202 run in-flight → 200 cached/fresh.
 * Infra failure (no DB) → 503, never a bare 500.
 */
export async function GET(req: Request) {
  const domain = cleanDomain(new URL(req.url).searchParams.get("domain"));
  if (!domain) return NextResponse.json({ error: "bad domain" }, { status: 400 });
  try {
    if (!(await isPaid(domain))) {
      return NextResponse.json({ error: "payment required" }, { status: 402 });
    }
    const state = await getReportState(domain, {
      store: pgStore,
      run: runnerFor(domain),
      schedule: after,
      now: Date.now,
    });
    if (state.status === "pending") {
      return NextResponse.json({ status: "pending" }, { status: 202 });
    }
    return NextResponse.json({
      status: "ready",
      mock: true,
      report: state.report,
      cached: state.cached,
      ageH: state.ageH,
    });
  } catch {
    return infra();
  }
}
