import { after } from "next/server";
import { NextResponse } from "next/server";
import { pgStore } from "@/lib/dbreports";
import { infra } from "@/lib/http";
import { runnerFor } from "@/lib/reports";
import { ensurePending, listStaleReady, getReport, setFailed } from "@/lib/store";

/**
 * Vercel Cron refresh (see vercel.json): re-runs stale paid reports so the
 * 24h cache stays fresh without recharging. Bearer-guarded, capped at 10.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const domains = await listStaleReady(10);
    after(async () => {
      for (const domain of domains) {
        try {
          const row = await getReport(domain);
          if (!row?.paid) continue;
          await ensurePending(domain);
          const report = await runnerFor(domain)();
          await pgStore.setReady(domain, report);
        } catch {
          await setFailed(domain);
        }
      }
    });
    return NextResponse.json({ queued: domains.length });
  } catch {
    return infra();
  }
}
