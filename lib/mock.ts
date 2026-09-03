// Canned provider data — stands in for Gemini prompt-gen + Firecrawl
// search/scrape until live providers land (Tickets 3+). Same numbers as the
// V2 prototype. Scoring math lives in ./scoring, never here.
import type { BuyerPrompt, Extract, Winner } from "./types";

export const MOCK_DOMAIN = "acmecrm.com";

export const MOCK_PHRASES: string[] = [
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

const MOCK_CITED_BY: Record<number, string> = {
  0: "acmecrm.com/blog/realtor-crm",
  1: "acmecrm.com/features/follow-up",
  3: "acmecrm.com/features/sms",
};

export const MOCK_PROMPTS: BuyerPrompt[] = MOCK_PHRASES.map((text, i) => ({
  text,
  cited: i in MOCK_CITED_BY,
  citedBy: MOCK_CITED_BY[i] ?? null,
}));

export const MOCK_WINNERS: Winner[] = [
  { name: "FollowUpBoss", page: "followupboss.com/realtor-crm", cites: 9 },
  { name: "HubSpot", page: "hubspot.com/crm/realtors", cites: 7 },
  { name: "Zoho CRM", page: "zoho.com/crm/realtors", cites: 5 },
];

export const MOCK_EXTRACT: Extract = {
  hasFAQ: false,
  hasPricingTable: false,
  hasSchema: false,
  hasLlmsTxt: false,
  wordCount: 620,
  winnerAvgWords: 2100,
};
