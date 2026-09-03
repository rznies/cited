// Ticket 2 — seam tests. External behavior only, canned fixtures, no live calls.
import { describe, expect, it } from "vitest";
import {
  buildFixes,
  citationShare,
  generateReport,
  parseExtract,
  validatePrompts,
  webScore,
} from "./scoring";
import { MOCK_EXTRACT, MOCK_PROMPTS, MOCK_WINNERS } from "./mock";

const TEN = [
  "best crm for realtors",
  "realtor follow-up software",
  "simple crm for small brokerage",
  "crm with sms for agents",
  "best follow-up boss alternative",
  "crm with idx integration",
  "affordable crm for solo agent",
  "crm email drip for listings",
  "realtor pipeline tool",
  "crm with open house app",
];

describe("validatePrompts (prompt-gen shape)", () => {
  it("accepts exactly 10 non-empty buyer prompts", () => {
    expect(validatePrompts(TEN)).toEqual(TEN);
  });
  it("rejects 9 prompts", () => {
    expect(() => validatePrompts(TEN.slice(0, 9))).toThrow();
  });
  it("rejects an empty prompt", () => {
    expect(() => validatePrompts([...TEN.slice(0, 9), "  "])).toThrow();
  });
  it("rejects non-arrays", () => {
    expect(() => validatePrompts("best crm")).toThrow();
  });
});

describe("citationShare + webScore (deterministic math)", () => {
  it("computes 0.3 share on the canned 3/10 fixture", () => {
    expect(citationShare(MOCK_PROMPTS)).toBeCloseTo(0.3);
  });
  it("scores the all-false-extract fixture at 18 (0.3*60 + 0 checks)", () => {
    expect(webScore(MOCK_PROMPTS, MOCK_EXTRACT)).toBe(18);
  });
  it("scores perfect visibility at 100", () => {
    const prompts = TEN.map((text) => ({ text, cited: true, citedBy: "x.com" }));
    const extract = { ...MOCK_EXTRACT, hasFAQ: true, hasPricingTable: true, hasSchema: true, hasLlmsTxt: true };
    expect(webScore(prompts, extract)).toBe(100);
  });
  it("scores total invisibility at 0", () => {
    const prompts = TEN.map((text) => ({ text, cited: false, citedBy: null }));
    expect(webScore(prompts, MOCK_EXTRACT)).toBe(0);
  });
});

describe("parseExtract (5-field schema)", () => {
  it("parses the canned extract", () => {
    expect(parseExtract(MOCK_EXTRACT)).toEqual(MOCK_EXTRACT);
  });
  it("rejects a missing field", () => {
    const { hasLlmsTxt: _drop, ...rest } = MOCK_EXTRACT;
    expect(() => parseExtract(rest)).toThrow();
  });
  it("rejects a wrong-typed wordCount", () => {
    expect(() => parseExtract({ ...MOCK_EXTRACT, wordCount: "lots" })).toThrow();
  });
});

describe("buildFixes (4 checks + capped playbook)", () => {
  it("returns 5 impact-ordered fixes", () => {
    const fixes = buildFixes(MOCK_PROMPTS, MOCK_WINNERS, MOCK_EXTRACT);
    expect(fixes).toHaveLength(5);
    expect(fixes.map((f) => f.impact)).toEqual(["High", "High", "Med", "Med", "High"]);
  });
  it("caps fix 5 to one sentence citing the top winner", () => {
    const fixes = buildFixes(MOCK_PROMPTS, MOCK_WINNERS, MOCK_EXTRACT);
    const fifth = fixes[4].detail;
    expect(fifth).toContain("FollowUpBoss");
    expect(fifth).toContain("3/10");
    expect(fifth.match(/\./g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe("generateReport (seam determinism)", () => {
  it("returns the same report twice on canned deps", async () => {
    const a = await generateReport("acmecrm.com");
    const b = await generateReport("acmecrm.com");
    expect(a).toEqual(b);
  });
  it("honors the contract shape", async () => {
    const r = await generateReport("acmecrm.com");
    expect(r.prompts).toHaveLength(10);
    expect(r.winners).toHaveLength(3);
    expect(r.fixes).toHaveLength(5);
    expect(r.webScore).toBe(18);
  });
});
