// Ticket 3b — cache/polling + domain normalization tests. Fake store, no DB.
import { describe, expect, it } from "vitest";
import { cleanDomain } from "./domains";
import { getReportState, type ReportStore } from "./reports";
import type { AuditReport } from "./types";

const NOW = 1_700_000_000_000;
const H = 3_600_000;

function cannedReport(): AuditReport {
  return {
    domain: "acmecrm.com",
    webScore: 18,
    citationPct: 30,
    prompts: [],
    winners: [],
    extract: { hasFAQ: false, hasPricingTable: false, hasSchema: false, hasLlmsTxt: false, wordCount: 1, winnerAvgWords: 2 },
    fixes: [],
  };
}

function fakeStore(
  rows: Record<string, { report: AuditReport; status: "pending" | "ready" | "failed"; createdAt: number }> = {},
) {
  const calls: string[] = [];
  const store: ReportStore = {
    async get(domain) {
      return rows[domain] ?? null;
    },
    async ensurePending(domain) {
      calls.push(`pending:${domain}`);
      rows[domain] = { report: cannedReport(), status: "pending", createdAt: NOW };
    },
    async setReady(domain, report) {
      calls.push(`ready:${domain}`);
      rows[domain] = { report, status: "ready", createdAt: NOW };
    },
    async setFailed(domain) {
      calls.push(`failed:${domain}`);
      rows[domain] = { report: cannedReport(), status: "failed", createdAt: NOW };
    },
  };
  return { store, calls };
}

const deps = (store: ReportStore, run?: () => Promise<AuditReport>) => ({
  store,
  run: run ?? (async () => cannedReport()),
  schedule: (fn: () => void) => {
    fn();
  },
  now: () => NOW,
});

describe("cleanDomain", () => {
  it("lowercases and accepts a normal domain", () => {
    expect(cleanDomain("AcmeCRM.com ")).toBe("acmecrm.com");
  });
  it("strips scheme, path, query and port from pasted URLs", () => {
    expect(cleanDomain("https://realtyassistant.in/F")).toBe("realtyassistant.in");
    expect(cleanDomain("http://Example.COM:8080/pricing?x=1#top")).toBe("example.com");
    expect(cleanDomain("www.example.com/")).toBe("www.example.com");
  });
  it("rejects garbage", () => {
    expect(cleanDomain("not a domain")).toBeNull();
    expect(cleanDomain("")).toBeNull();
    expect(cleanDomain(42)).toBeNull();
    expect(cleanDomain("https://")).toBeNull();
  });
});

describe("getReportState", () => {
  it("serves a fresh row from cache with its age", async () => {
    const report = cannedReport();
    const { store } = fakeStore({ "acmecrm.com": { report, status: "ready", createdAt: NOW - 18 * H } });
    const state = await getReportState("acmecrm.com", deps(store));
    expect(state).toMatchObject({ status: "ready", cached: true, ageH: 18, report });
  });
  it("returns pending without recomputing when a run is in-flight", async () => {
    const report = cannedReport();
    const { store, calls } = fakeStore({ "acmecrm.com": { report, status: "pending", createdAt: NOW } });
    let runs = 0;
    const state = await getReportState(
      "acmecrm.com",
      deps(store, async () => {
        runs += 1;
        return cannedReport();
      }),
    );
    expect(state).toEqual({ status: "pending" });
    expect(runs).toBe(0);
    expect(calls).toEqual([]);
  });
  it("starts a run on a cold miss, then serves it cached", async () => {
    const { store } = fakeStore();
    const d = deps(store);
    expect(await getReportState("acmecrm.com", d)).toEqual({ status: "pending" });
    expect(await getReportState("acmecrm.com", d)).toMatchObject({
      status: "ready",
      cached: true,
      ageH: 0,
    });
  });
  it("refreshes a stale row in the background", async () => {
    const { store } = fakeStore({
      "acmecrm.com": { report: cannedReport(), status: "ready", createdAt: NOW - 30 * H },
    });
    const d = deps(store);
    expect(await getReportState("acmecrm.com", d)).toEqual({ status: "pending" });
    expect(await getReportState("acmecrm.com", d)).toMatchObject({ status: "ready", cached: true });
  });
  it("marks failed when the run throws", async () => {
    const { store, calls } = fakeStore();
    const d = deps(store, async () => {
      throw new Error("provider blip");
    });
    // schedule swallows into setFailed; state stays pending for this caller
    expect(await getReportState("acmecrm.com", d)).toEqual({ status: "pending" });
    expect(calls).toContain("failed:acmecrm.com");
  });
});
