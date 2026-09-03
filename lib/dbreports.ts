// Postgres-backed ReportStore for lib/reports (assembled by routes only).
import { getReport, saveReport, ensurePending, setFailed } from "./store";
import type { ReportStore } from "./reports";

export const pgStore: ReportStore = {
  async get(domain) {
    const row = await getReport(domain);
    if (!row) return null;
    return { report: row.reportJson, status: row.status, createdAt: row.createdAt.getTime() };
  },
  ensurePending,
  async setReady(domain, report) {
    const existing = await getReport(domain);
    await saveReport({
      domain,
      promptsJson: report.prompts,
      score: report.webScore,
      fixes: report.fixes,
      status: "ready",
      paid: existing?.paid ?? false,
      reportJson: report,
      shareToken: existing?.shareToken ?? null,
    });
  },
  setFailed,
};
