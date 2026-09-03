// Ticket 5 — share token + PDF tests. No DB, no network.
import { describe, expect, it } from "vitest";
import { buildPdf } from "./pdf";
import { newShareToken } from "./share";
import type { AuditReport } from "./types";

const REPORT: AuditReport = {
  domain: "acmecrm.com",
  webScore: 18,
  citationPct: 30,
  prompts: [{ text: "best crm for realtors", cited: true, citedBy: "acmecrm.com/blog" }],
  winners: [{ name: "FollowUpBoss", page: "followupboss.com", cites: 9 }],
  extract: { hasFAQ: false, hasPricingTable: false, hasSchema: false, hasLlmsTxt: false, wordCount: 620, winnerAvgWords: 2100 },
  fixes: [{ title: "Add FAQ schema", impact: "High", effort: "2h", detail: "Winners ship it; you don't." }],
};

describe("newShareToken", () => {
  it("mints 64-hex-char tokens that differ", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("buildPdf", () => {
  it("produces a non-empty PDF document", async () => {
    const bytes = await buildPdf(REPORT, "2026-09-03");
    expect(bytes.length).toBeGreaterThan(500);
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  });
});
