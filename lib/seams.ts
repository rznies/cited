// Seams — UI hangs off these; nothing else may call providers directly.
// generateReport is REAL since Ticket 2 (deterministic assembly over canned
// deps in ./scoring). scorePaste stays stubbed until Ticket 4.
import { scorePaste as analyze } from "./paste";
import { generateReport as assemble } from "./scoring";
import type { AuditReport, PasteScore } from "./types";

export async function generateReport(domain: string): Promise<AuditReport> {
  return assemble(domain);
}

/** REAL since Ticket 4: rule-based v1, stateless (localStorage only, no DB). */
export async function scorePaste(text: string, domain: string): Promise<PasteScore> {
  return analyze(text, domain);
}
