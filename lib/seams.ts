// Seams — UI hangs off these; nothing else may call providers directly.
// generateReport is REAL since Ticket 2 (deterministic assembly over canned
// deps in ./scoring). scorePaste is REAL since Ticket 4 (rule-based v1).
import { scorePaste as analyze } from "./paste";
import { assembleLiveReport } from "./providers/live";
import { liveDeps } from "./providers/firecrawl";
import { generateReport as assemble } from "./scoring";
import type { AuditReport, PasteScore } from "./types";

function hasLiveKeys(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.FIRECRAWL_API_KEY);
}

export async function generateReport(domain: string): Promise<AuditReport> {
  if (hasLiveKeys()) return assembleLiveReport(domain, liveDeps());
  return assemble(domain);
}

/** REAL since Ticket 4: rule-based v1, stateless (localStorage only, no DB). */
export async function scorePaste(text: string, domain: string): Promise<PasteScore> {
  return analyze(text, domain);
}
