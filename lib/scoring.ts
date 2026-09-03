// Deterministic scoring core — pure functions + seam assembly.
// Only this module (plus canned deps) decides numbers; LLM wording never does.
import { MOCK_EXTRACT, MOCK_PHRASES, MOCK_PROMPTS, MOCK_WINNERS } from "./mock";
import type { AuditReport, BuyerPrompt, Extract, Fix, Winner } from "./types";

/** Provider boundary (Firecrawl/Gemini in production, canned in V1/tests). */
export interface ReportDeps {
  phrases(): string[];
  winners(): Winner[];
  extract(): unknown;
}

const cannedDeps: ReportDeps = {
  phrases: () => MOCK_PHRASES,
  winners: () => MOCK_WINNERS,
  extract: () => MOCK_EXTRACT,
};

/** Prompt-gen shape guard: exactly 10 non-empty buyer prompts. */
export function validatePrompts(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length !== 10) throw new Error("expected 10 prompts");
  for (const p of raw) {
    if (typeof p !== "string" || p.trim() === "") throw new Error("prompt must be non-empty");
  }
  return raw as string[];
}

/** Share of prompts citing the domain, 0..1. */
export function citationShare(prompts: BuyerPrompt[]): number {
  if (prompts.length === 0) return 0;
  return prompts.filter((p) => p.cited).length / prompts.length;
}

function passedChecks(extract: Extract): number {
  return [extract.hasFAQ, extract.hasPricingTable, extract.hasSchema, extract.hasLlmsTxt].filter(
    Boolean,
  ).length;
}

/** 0–100: citation share earns up to 60, each passed check earns 10. */
export function webScore(prompts: BuyerPrompt[], extract: Extract): number {
  const score = Math.round(citationShare(prompts) * 60 + passedChecks(extract) * 10);
  return Math.min(100, Math.max(0, score));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** 5-field extract guard — never more fields in V1, never fewer. */
export function parseExtract(raw: unknown): Extract {
  if (!isRecord(raw)) throw new Error("extract must be an object");
  for (const k of ["hasFAQ", "hasPricingTable", "hasSchema", "hasLlmsTxt"]) {
    if (typeof raw[k] !== "boolean") throw new Error(`extract.${k} must be boolean`);
  }
  for (const k of ["wordCount", "winnerAvgWords"]) {
    if (typeof raw[k] !== "number" || !Number.isFinite(raw[k])) {
      throw new Error(`extract.${k} must be a number`);
    }
  }
  return {
    hasFAQ: raw.hasFAQ as boolean,
    hasPricingTable: raw.hasPricingTable as boolean,
    hasSchema: raw.hasSchema as boolean,
    hasLlmsTxt: raw.hasLlmsTxt as boolean,
    wordCount: raw.wordCount as number,
    winnerAvgWords: raw.winnerAvgWords as number,
  };
}

/** 4 deterministic checks + 1 capped playbook sentence citing who-beats-me. */
export function buildFixes(prompts: BuyerPrompt[], winners: Winner[], extract: Extract): Fix[] {
  const citedCount = prompts.filter((p) => p.cited).length;
  const top = winners.reduce((a, b) => (b.cites > a.cites ? b : a), winners[0]);
  const fifth = top
    ? `Cited in ${citedCount}/10 prompts vs ${top.name} ${top.cites}/10 — pitch the listicles that cite every winner.`
    : "No winners detected across 10 prompts — broaden the buyer prompts.";
  return [    { title: "Add FAQ + FAQPage schema to /realtor-crm", impact: "High", effort: "2h", detail: "Winners all ship FAQ schema; you ship none. Unblocks Google AI citations." },
    { title: "Ship /llms.txt + comparison page", impact: "High", effort: "3h", detail: "No llms.txt found. Add 30-line llms.txt pointing at pricing + comparisons." },
    { title: "Add pricing table in HTML (not JS image)", impact: "Med", effort: "2h", detail: "Extract found no pricing table. AI can't quote what it can't parse." },
    { title: `Expand realtor page ${extract.wordCount} → 1500+ words`, impact: "Med", effort: "4h", detail: `Winners avg ${extract.winnerAvgWords} words with headings. Yours is thin.` },
    { title: "Get cited: pitch 3 listicles that cite all winners", impact: "High", effort: "1d", detail: fifth },
  ];
}

/** generateReport(domain) — deterministic assembly over injectable deps. */
export async function generateReport(
  domain: string,
  deps: ReportDeps = cannedDeps,
): Promise<AuditReport> {
  const phrases = validatePrompts(deps.phrases());
  const winners = deps.winners();
  const extract = parseExtract(deps.extract());
  // Canned V1 citation map lives with the fixture (Ticket 3 wires live search).
  const byText = new Map(MOCK_PROMPTS.map((p) => [p.text, p]));
  const prompts: BuyerPrompt[] = phrases.map(
    (text) => byText.get(text) ?? { text, cited: false, citedBy: null },
  );
  const share = citationShare(prompts);
  return {
    domain,
    webScore: webScore(prompts, extract),
    citationPct: Math.round(share * 100),
    prompts,
    winners,
    extract,
    fixes: buildFixes(prompts, winners, extract),
  };
}
