// Firecrawl boundary — thin REST over v2 search/scrape, fetch injectable.
// Shapes verified live against the v2 API (data.web[]).
import type { ScrapedPage, SearchHit } from "./live";
import { livePromptGen } from "./gemini";

const BASE = "https://api.firecrawl.dev";

interface SearchResponse {
  success: boolean;
  data?: { web?: { url?: string; title?: string; description?: string }[] };
}

interface ScrapeResponse {
  success: boolean;
  data?: { markdown?: string; html?: string };
}

export function liveFirecrawl(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): {
  search(phrase: string): Promise<SearchHit[]>;
  scrape(url: string): Promise<ScrapedPage>;
  checkLlms(domain: string): Promise<boolean>;
} {
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  return {
    async search(phrase: string): Promise<SearchHit[]> {
      const res = await fetchFn(`${BASE}/v2/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: phrase, limit: 5 }),
      });
      if (!res.ok) throw new Error(`firecrawl search ${res.status}`);
      const json = (await res.json()) as SearchResponse;
      return (json.data?.web ?? []).map((w) => ({
        url: w.url ?? "",
        title: w.title ?? "",
        description: w.description ?? "",
      }));
    },
    async scrape(url: string): Promise<ScrapedPage> {
      const res = await fetchFn(`${BASE}/v2/scrape`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url, formats: ["markdown", "html"] }),
      });
      if (!res.ok) throw new Error(`firecrawl scrape ${res.status}`);
      const json = (await res.json()) as ScrapeResponse;
      return { markdown: json.data?.markdown ?? "", html: json.data?.html ?? "" };
    },
    async checkLlms(domain: string): Promise<boolean> {
      const host = domain.replace(/^https?:\/\//, "").split("/")[0];
      const res = await fetchFn(`https://${host}/llms.txt`);
      if (!res.ok) return false;
      return ((await res.text()).trim().length > 0);
    },
  };
}

/** Live ReportDeps assembly — throws when keys are absent (never half-live). */
export function liveDeps(env: { [key: string]: string | undefined } = process.env): {
  promptPhrases(domain: string): Promise<unknown>;
  search(phrase: string): Promise<SearchHit[]>;
  scrape(url: string): Promise<ScrapedPage>;
  checkLlms(domain: string): Promise<boolean>;
} {
  const gKey = env.GEMINI_API_KEY;
  const fKey = env.FIRECRAWL_API_KEY;
  if (!gKey || !fKey) throw new Error("live providers not configured");
  const gen = livePromptGen(gKey);
  const fc = liveFirecrawl(fKey);
  return {
    promptPhrases: (domain: string) => gen.promptPhrases(domain),
    search: (phrase: string) => fc.search(phrase),
    scrape: (url: string) => fc.scrape(url),
    checkLlms: (domain: string) => fc.checkLlms(domain),
  };
}
