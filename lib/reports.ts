// Report cache + polling core — pure orchestration over an injected store.
// Fresh (<24h) ready rows serve cached; anything else starts (or joins) a run
// and answers pending. The DB row is the cross-instance lock.
import { generateReport } from "./seams";
import type { AuditReport, ReportStatus } from "./types";

export const FRESH_MS = 24 * 3_600_000;

export interface StoredReport {
  report: AuditReport | null;
  status: ReportStatus;
  createdAt: number;
}

export interface ReportStore {
  get(domain: string): Promise<StoredReport | null>;
  ensurePending(domain: string): Promise<void>;
  setReady(domain: string, report: AuditReport): Promise<void>;
  setFailed(domain: string): Promise<void>;
}

export type ReportState =
  | { status: "ready"; report: AuditReport; cached: boolean; ageH: number }
  | { status: "pending" };

export interface ReportDeps {
  store: ReportStore;
  run(): Promise<AuditReport>;
  schedule(fn: () => void): void;
  now(): number;
}

export async function getReportState(
  domain: string,
  deps: ReportDeps,
): Promise<ReportState> {
  const row = await deps.store.get(domain);
  if (row?.status === "ready" && row.report) {
    const ageH = Math.floor((deps.now() - row.createdAt) / 3_600_000);
    if (deps.now() - row.createdAt < FRESH_MS) {
      return { status: "ready", report: row.report, cached: true, ageH };
    }
  }
  if (row?.status === "pending") return { status: "pending" };
  // Cold miss, stale, or failed → (re)start a run, answer pending now.
  await deps.store.ensurePending(domain);
  deps.schedule(() => {
    void deps
      .run()
      .then(
        (report) => deps.store.setReady(domain, report),
        () => deps.store.setFailed(domain),
      );
  });
  return { status: "pending" };
}

/** Production wiring is assembled by routes (needs next/after + pg store). */
export function runnerFor(domain: string): () => Promise<AuditReport> {
  return () => generateReport(domain);
}
