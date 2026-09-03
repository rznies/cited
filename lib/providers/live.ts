// Live provider assembly — mapping is pure and tested; network lives behind
// the LiveDeps boundary (faked in tests). Scoring math stays in ../scoring.
import { buildFixes, citationShare, parseExtract, validatePrompts, webScore } from "../scoring";
import type { AuditReport, BuyerPrompt, Extract, Winner } from "../types";

export interface SearchHit {
  url: string;
  title: string;
  description: string;
}

export interface ScrapedPage {
  markdown: string;
  html: string;
}

export interface LiveDeps {
  promptPhrases(domain: string): Promise<unknown>;
  search(phrase: string): Promise<SearchHit[]>;
  scrape(url: string): Promise<ScrapedPage>;
  checkLlms(domain: string): Promise<boolean>;
}

function brandOf(domain: string): string {
  return domain.toLowerCase().split(".")[0].replace(/[^a-z0-9]/g, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Citation evidence for one phrase: domain host or brand in url/title/desc. */
export function citationsFor(
  hits: SearchHit[],
  domain: string,
): { cited: boolean; citedBy: string | null } {
  const d = domain.toLowerCase();
  const brand = brandOf(domain);
  for (const h of hits) {
    const hay = `${h.url} ${h.title} ${h.description}`.toLowerCase();
    if (hostOf(h.url) === d || hostOf(h.url).endsWith(`.${d}`) || (brand && hay.includes(brand))) {
      return { cited: true, citedBy: h.url };
    }
  }
  return { cited: false, citedBy: null };
}

/** Top-3 rival hosts by prompt coverage (audited domain excluded). */
export function aggregateWinners(perPhrase: SearchHit[][], domain: string, take = 3): Winner[] {
  const d = domain.toLowerCase();
  const coverage = new Map<string, { cites: number; page: string }>();
  for (const hits of perPhrase) {
    const seen = new Set<string>();
    for (const h of hits) {
      const host = hostOf(h.url);
      if (!host || host === d || host.endsWith(`.${d}`) || seen.has(host)) continue;
      seen.add(host);
      const cur = coverage.get(host) ?? { cites: 0, page: h.url };
      coverage.set(host, { cites: cur.cites + 1, page: cur.page });
    }
  }
  return [...coverage.entries()]
    .sort((a, b) => b[1].cites - a[1].cites)
    .slice(0, take)
    .map(([host, v]) => ({ name: host, page: v.page, cites: v.cites }));
}

/** 5-field extract from scraped markdown + html. */
export function analyzeExtract(markdown: string, html: string, llmsTxt: boolean): Extract {
  const md = markdown.toLowerCase();
  const hasFAQ = /faqpage/i.test(html) || /^#{1,4}\s.*\bfAQ\b/im.test(markdown) || md.includes("frequently asked questions");
  const hasPricingTable =
    /<table[\s>]/i.test(html) && /\$\s?\d|pricing|plans?/i.test(`${markdown} ${html}`);
  const hasSchema = /application\/ld\+json/i.test(html);
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  return parseExtract({
    hasFAQ,
    hasPricingTable,
    hasSchema,
    hasLlmsTxt: llmsTxt,
    wordCount,
    winnerAvgWords: 0,
  });
}

/** Full live assembly — deterministic given the same provider responses. */
export async function assembleLiveReport(domain: string, deps: LiveDeps): Promise<AuditReport> {
  const phrases = validatePrompts(await deps.promptPhrases(domain));
  const perPhrase: SearchHit[][] = [];
  for (const phrase of phrases) {
    perPhrase.push(await deps.search(phrase));
  }
  const prompts: BuyerPrompt[] = phrases.map((text, i) => {
    const { cited, citedBy } = citationsFor(perPhrase[i], domain);
    return { text, cited, citedBy };
  });
  const winners = aggregateWinners(perPhrase, domain);
  const pages = [domain, ...winners.map((w) => w.page)];
  const scraped = [];
  for (const url of pages) {
    const target = url.startsWith("http") ? url : `https://${url}`;
    try {
      scraped.push(await deps.scrape(target));
    } catch {
      scraped.push({ markdown: "", html: "" });
    }
  }
  const llms = await deps.checkLlms(domain).catch(() => false);
  const extracts = scraped.map((s) => analyzeExtract(s.markdown, s.html, false));
  const self = extracts[0];
  const winnerAvg = extracts.length > 1
    ? Math.round(extracts.slice(1).reduce((a, e) => a + e.wordCount, 0) / (extracts.length - 1))
    : 0;
  const extract: Extract = { ...self, hasLlmsTxt: llms, winnerAvgWords: winnerAvg };
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
