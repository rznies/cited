// MOCK data — canned Firecrawl+Gemini output for the Ticket 1 shell.
// Same fixture as prototype/aeo-v1-v2-v3. Dies when Ticket 2 lands the real seam.
import type { AuditReport } from "./types";

export const MOCK_DOMAIN = "acmecrm.com";

export const MOCK_REPORT: AuditReport = {
  domain: MOCK_DOMAIN,
  webScore: 42,
  citationPct: 30,
  prompts: [
    { text: "best crm for realtors", cited: true, citedBy: "acmecrm.com/blog/realtor-crm" },
    { text: "realtor follow-up software", cited: true, citedBy: "acmecrm.com/features/follow-up" },
    { text: "simple crm for small brokerage", cited: false, citedBy: null },
    { text: "crm with sms for agents", cited: true, citedBy: "acmecrm.com/features/sms" },
    { text: "best follow-up boss alternative", cited: false, citedBy: null },
    { text: "crm with idx integration", cited: false, citedBy: null },
    { text: "affordable crm for solo agent", cited: false, citedBy: null },
    { text: "crm email drip for listings", cited: false, citedBy: null },
    { text: "realtor pipeline tool", cited: false, citedBy: null },
    { text: "crm with open house app", cited: false, citedBy: null },
  ],
  winners: [
    { name: "FollowUpBoss", page: "followupboss.com/realtor-crm", cites: 9 },
    { name: "HubSpot", page: "hubspot.com/crm/realtors", cites: 7 },
    { name: "Zoho CRM", page: "zoho.com/crm/realtors", cites: 5 },
  ],
  extract: {
    hasFAQ: false,
    hasPricingTable: false,
    hasSchema: false,
    hasLlmsTxt: false,
    wordCount: 620,
    winnerAvgWords: 2100,
  },
  fixes: [
    { title: "Add FAQ + FAQPage schema to /realtor-crm", impact: "High", effort: "2h", detail: "Winners all ship FAQ schema; you ship none. Unblocks Google AI citations." },
    { title: "Ship /llms.txt + comparison page", impact: "High", effort: "3h", detail: "No llms.txt found. Add 30-line llms.txt pointing at pricing + comparisons." },
    { title: "Add pricing table in HTML (not JS image)", impact: "Med", effort: "2h", detail: "Extract found no pricing table. AI can't quote what it can't parse." },
    { title: "Expand realtor page 620 → 1500+ words", impact: "Med", effort: "4h", detail: "Winners avg 2100 words with headings. Yours is thin." },
    { title: "Get cited: pitch 3 listicles that cite all winners", impact: "High", effort: "1d", detail: "Cited in 3/10 prompts vs FollowUpBoss 9/10. Same 3 listicles cite every winner — pitch them." },
  ],
};
