// Seams — stubbed in Ticket 1, real in Tickets 2 (generateReport) and 4 (scorePaste).
// UI hangs off these; nothing else may call providers directly.
import { MOCK_REPORT } from "./mock";
import type { AuditReport, PasteScore } from "./types";

/** STUB (Ticket 2 builds the real one): returns canned report, no provider calls. */
export async function generateReport(_domain: string): Promise<AuditReport> {
  return MOCK_REPORT;
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
