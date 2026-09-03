// Ticket 4 — paste seam tests. Deterministic rule-based v1 (Gemini semantic
// scoring later); canned texts, no live calls, no store.
import { describe, expect, it } from "vitest";
import { scorePaste } from "./paste";

const COMPETITORS = ["FollowUpBoss", "HubSpot", "Zoho CRM"];

describe("scorePaste", () => {
  it("detects the domain leading the answer", () => {
    const r = scorePaste(
      "AcmeCRM is the top pick for realtors. FollowUpBoss is another option.",
      "acmecrm.com",
      COMPETITORS,
    );
    expect(r).toMatchObject({ mentioned: true, competitorsFound: ["FollowUpBoss"], score: 85 });
    expect(r.rankHint).toContain("leads");
  });
  it("detects the domain trailing competitors", () => {
    const r = scorePaste(
      "FollowUpBoss and HubSpot are top picks for realtors. Also consider AcmeCRM.",
      "acmecrm.com",
      COMPETITORS,
    );
    expect(r).toMatchObject({
      mentioned: true,
      competitorsFound: ["FollowUpBoss", "HubSpot"],
      score: 60,
    });
    expect(r.rankHint).toContain("trails");
  });
  it("handles absence with a competitor-naming fix", () => {
    const r = scorePaste(
      "FollowUpBoss and HubSpot are top picks for realtors…",
      "acmecrm.com",
      COMPETITORS,
    );
    expect(r).toMatchObject({ mentioned: false, score: 15 });
    expect(r.rankHint).toContain("not in");
    expect(r.oneFix).toContain("FollowUpBoss");
  });
  it("matches the bare brand name, not just the domain", () => {
    const r = scorePaste("I recommend AcmeCRM for solo agents.", "acmecrm.com", COMPETITORS);
    expect(r.mentioned).toBe(true);
  });
  it("returns a graceful negative for empty text, never throws", () => {
    const r = scorePaste("   ", "acmecrm.com", COMPETITORS);
    expect(r).toMatchObject({ mentioned: false, competitorsFound: [], score: 15 });
    expect(r.oneFix.length).toBeGreaterThan(0);
  });
  it("caps input at 20000 chars", () => {
    expect(() => scorePaste("x".repeat(20001), "acmecrm.com", COMPETITORS)).toThrow();
  });
});
