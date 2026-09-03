// Domain types. Vocabulary: teaser, gate, webScore, pasteScore, who-beats-me, fix.
// Contracts owned by the two seams (see ./seams.ts).

export type ReportStatus = "pending" | "ready" | "failed";

export interface BuyerPrompt {
  text: string;
  cited: boolean;
  citedBy: string | null;
}

export interface Winner {
  name: string;
  page: string;
  cites: number;
}

export interface Extract {
  hasFAQ: boolean;
  hasPricingTable: boolean;
  hasSchema: boolean;
  hasLlmsTxt: boolean;
  wordCount: number;
  winnerAvgWords: number;
}

export interface Fix {
  title: string;
  impact: "High" | "Med";
  effort: string;
  detail: string;
}

/** generateReport(domain) contract — cached 24h, owns Firecrawl + Gemini diff. */
export interface AuditReport {
  domain: string;
  webScore: number;
  citationPct: number;
  prompts: BuyerPrompt[];
  winners: Winner[];
  extract: Extract;
  fixes: Fix[];
}

/** scorePaste(text, domain) contract — stateless, no cache row. Score is a
 *  rule-based v1 heuristic (85 leads / 60 trails / 15 absent), not a model. */
export interface PasteScore {
  mentioned: boolean;
  rankHint: string;
  competitorsFound: string[];
  oneFix: string;
  score: number;
}

/** Row shape of the reports table (see db/schema.sql). */
export interface ReportRow {
  domain: string;
  promptsJson: BuyerPrompt[];
  score: number;
  fixes: Fix[];
  status: ReportStatus;
  paid: boolean;
  reportJson: AuditReport | null;
  createdAt: Date;
}
