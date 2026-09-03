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
  /**
   * POST with bounded retries: 429 waits 5s once (burst limit); 5xx and
   * network throws retry twice (2s, 5s). 4xx (auth/quota/shape) fails fast —
   * retrying those burns credits and hides real errors. Anything still failing
   * throws into the failed/503 paths, never a partial score.
   */
  async function post(path: string, body: unknown): Promise<Response> {
    const send = () =>
      fetchFn(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    let attempt = 0;
    for (;;) {
      let res: Response;
      try {
        res = await send();
      } catch (e) {
        if (attempt >= 2) throw e;
        await sleep(attempt === 0 ? 2000 : 5000);
        attempt += 1;
        continue;
      }
      if (res.ok) return res;
      if (res.status === 429 && attempt === 0) {
        await sleep(5000);
        attempt += 1;
        continue;
      }
      if (res.status >= 500 && attempt < 2) {
        await sleep(attempt === 0 ? 2000 : 5000);
        attempt += 1;
        continue;
      }
      throw new Error(`firecrawl ${path} ${res.status}`);
    }
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
