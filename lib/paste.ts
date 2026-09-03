// scorePaste — rule-based v1 over pasted ChatGPT text. Deterministic, stateless
// (never touches the store). Gemini semantic scoring can replace the inside
// later; the PasteScore contract stays.
import type { PasteScore } from "./types";

export const MAX_PASTE = 20_000;
export const DEFAULT_COMPETITORS = ["FollowUpBoss", "HubSpot", "Zoho CRM"];

function brandOf(domain: string): string {
  return domain.toLowerCase().split(".")[0].replace(/[^a-z0-9]/g, "");
}

function firstIndex(hay: string, needles: string[]): number {
  let at = -1;
  for (const n of needles) {
    if (!n) continue;
    const i = hay.indexOf(n);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  return at;
}

function competitorHits(text: string, competitors: string[]): { name: string; at: number }[] {
  const out: { name: string; at: number }[] = [];
  for (const name of competitors) {
    const lower = name.toLowerCase();
    const at = firstIndex(text, [lower, lower.replace(/\s+/g, "")]);
    if (at >= 0) out.push({ name, at });
  }
  return out.sort((a, b) => a.at - b.at);
}

export function scorePaste(
  text: string,
  domain: string,
  competitors: string[] = DEFAULT_COMPETITORS,
): PasteScore {
  if (typeof text !== "string" || text.length > MAX_PASTE) {
    throw new Error(`paste must be under ${MAX_PASTE} chars`);
  }
  const t = text.toLowerCase();
  const d = domain.toLowerCase();
  const at = firstIndex(t, [d, brandOf(domain)]);
  const found = competitorHits(t, competitors);

  if (at < 0) {
    return {
      mentioned: false,
      rankHint: "not in the pasted answer",
      competitorsFound: found.map((f) => f.name),
      oneFix:
        found.length > 0
          ? `Add a 'vs ${found[0].name}' section — pasted answer compares them, never you.`
          : "No competitors detected either — paste a recommendation-style answer.",
      score: 15,
    };
  }
  const earlier = found.filter((f) => f.at < at).map((f) => f.name);
  if (earlier.length === 0) {
    return {
      mentioned: true,
      rankHint: "leads the pasted answer",
      competitorsFound: found.map((f) => f.name),
      oneFix: "You lead this answer — keep the comparison pages that earned it.",
      score: 85,
    };
  }
  return {
    mentioned: true,
    rankHint: `trails ${earlier.join(", ")} in the pasted answer`,
    competitorsFound: found.map((f) => f.name),
    oneFix: `You trail ${earlier[0]} — ship a '${brandOf(domain)} vs ${earlier[0]}' comparison so answers cite you first.`,
    score: 60,
  };
}
