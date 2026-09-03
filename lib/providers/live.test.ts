// Ticket 6 — provider mapping tests. Canned payloads only, zero network.
import { describe, expect, it } from "vitest";
import {
  aggregateWinners,
  analyzeExtract,
  assembleLiveReport,
  citationsFor,
  type LiveDeps,
  type SearchHit,
} from "./live";

const HITS: SearchHit[] = [
  { url: "https://acmecrm.com/blog/realtor-crm", title: "AcmeCRM for realtors", description: "AcmeCRM helps agents" },
  { url: "https://followupboss.com/realtor-crm", title: "FollowUpBoss realtor CRM", description: "leader" },
  { url: "https://hubspot.com/crm/realtors", title: "HubSpot for realtors", description: "free crm" },
];

describe("citationsFor", () => {
  it("matches the domain by host", () => {
    expect(citationsFor(HITS, "acmecrm.com")).toEqual({
      cited: true,
      citedBy: "https://acmecrm.com/blog/realtor-crm",
    });
  });
  it("matches the bare brand in title text", () => {
    const hits = [{ url: "https://example.com/list", title: "AcmeCRM vs others", description: "x" }];
    expect(citationsFor(hits, "acmecrm.com").cited).toBe(true);
  });
  it("reports a miss", () => {
    expect(citationsFor(HITS.slice(1), "acmecrm.com")).toEqual({ cited: false, citedBy: null });
  });
});

describe("aggregateWinners", () => {
  it("ranks non-domain hosts by prompt coverage, top 3", () => {
    const perPhrase = [
      HITS,
      [
        { url: "https://followupboss.com/other", title: "FUB", description: "" },
        { url: "https://zoho.com/crm", title: "Zoho", description: "" },
      ],
    ];
    const winners = aggregateWinners(perPhrase, "acmecrm.com");
    expect(winners.map((w) => w.name)).toEqual(["followupboss.com", "hubspot.com", "zoho.com"]);
    expect(winners[0]).toMatchObject({ cites: 2 });
  });
  it("never lists the audited domain", () => {
    const winners = aggregateWinners([HITS, HITS], "acmecrm.com");
    expect(winners.every((w) => !w.page.includes("acmecrm.com"))).toBe(true);
  });
});

describe("analyzeExtract", () => {
  it("detects checks and counts words", () => {
    const md = "# Pricing\n\nOur plans cost $29. ".repeat(100);
    const html = '<html><head><script type="application/ld+json">{"@type":"FAQPage"}</script></head><body><h2>FAQ</h2><table><tr><td>Pro $29</td></tr></table></body></html>';
    const e = analyzeExtract(md, html, true);
    expect(e).toMatchObject({ hasFAQ: true, hasPricingTable: true, hasSchema: true, hasLlmsTxt: true });
    expect(e.wordCount).toBeGreaterThan(300);
  });
  it("reports all-false on thin pages", () => {
    const e = analyzeExtract("hello world", "<html><body>hello world</body></html>", false);
    expect(e).toMatchObject({ hasFAQ: false, hasPricingTable: false, hasSchema: false, hasLlmsTxt: false });
  });
});

describe("assembleLiveReport (fake deps, no network)", () => {
  const deps: LiveDeps = {
    promptPhrases: async () => [
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
    ],
    search: async () => HITS,
    scrape: async (url: string) =>
      url.includes("acmecrm.com")
        ? { markdown: "AcmeCRM does follow up. ".repeat(200), html: "<html><body>AcmeCRM</body></html>" }
        : { markdown: "Winner page with pricing $49 and FAQ. ".repeat(300), html: "<html><body><h2>FAQ</h2></body></html>" },
    checkLlms: async () => false,
  };
  it("assembles a deterministic contract-shaped report", async () => {
    const a = await assembleLiveReport("acmecrm.com", deps);
    const b = await assembleLiveReport("acmecrm.com", deps);
    expect(a).toEqual(b);
    expect(a.prompts).toHaveLength(10);
    expect(a.winners).toHaveLength(2); // fake search returns the same 2 rivals per phrase
    expect(a.fixes).toHaveLength(5);
    expect(a.prompts[0]).toMatchObject({ cited: true });
  });
});
