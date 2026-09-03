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
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  /** One retry on 429 (burst limit) after 5s; anything else throws immediately. */
  async function post(path: string, body: unknown): Promise<Response> {
    const res = await fetchFn(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (res.status === 429) {
      await sleep(5000);
      const retry = await fetchFn(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!retry.ok) throw new Error(`firecrawl ${path} ${retry.status}`);
      return retry;
    }
    if (!res.ok) throw new Error(`firecrawl ${path} ${res.status}`);
    return res;
  }
  return {
    async search(phrase: string): Promise<SearchHit[]> {
      const res = await post("/v2/search", { query: phrase, limit: 5 });
      const json = (await res.json()) as SearchResponse;
      return (json.data?.web ?? []).map((w) => ({
        url: w.url ?? "",
        title: w.title ?? "",
        description: w.description ?? "",
      }));
    },
    async scrape(url: string): Promise<ScrapedPage> {
      const res = await post("/v2/scrape", { url, formats: ["markdown", "html"] });
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
