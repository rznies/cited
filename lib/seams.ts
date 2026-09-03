// Seams — UI hangs off these; nothing else may call providers directly.
// generateReport is REAL since Ticket 2 (deterministic assembly over canned
// deps in ./scoring). scorePaste stays stubbed until Ticket 4.
import { generateReport as assemble } from "./scoring";
import type { AuditReport, PasteScore } from "./types";

export async function generateReport(domain: string): Promise<AuditReport> {
  return assemble(domain);
}

/** STUB (Ticket 4 builds the real one): canned paste result, stateless. */
export async function scorePaste(_text: string, _domain: string): Promise<PasteScore> {
  return {
    mentioned: false,
    rankHint: "not in pasted top-5",
    competitorsFound: ["FollowUpBoss", "HubSpot"],
    oneFix: "Add a 'vs FollowUpBoss' section — pasted answer compares them, never you.",
  };
}
