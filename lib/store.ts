// Reports store — Postgres access for the `reports` table (see db/schema.sql).
// Wired to DATABASE_URL; exercised by Tickets 2+ (Ticket 1 only proves the shape).
import { Pool } from "pg";
import type { Fix, ReportRow, ReportStatus, BuyerPrompt } from "./types";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

interface ReportDbRow {
  domain: string;
  prompts_json: BuyerPrompt[];
  score: number;
  fixes: Fix[];
  status: ReportStatus;
  paid: boolean;
  created_at: Date;
}

function toReportRow(r: ReportDbRow): ReportRow {
  return {
    domain: r.domain,
    promptsJson: r.prompts_json,
    score: r.score,
    fixes: r.fixes,
    status: r.status,
    paid: r.paid,
    createdAt: r.created_at,
  };
}

export async function getReport(domain: string): Promise<ReportRow | null> {
  const { rows } = await getPool().query<ReportDbRow>(
    "SELECT domain, prompts_json, score, fixes, status, paid, created_at FROM reports WHERE domain = $1",
    [domain],
  );
  return rows[0] ? toReportRow(rows[0]) : null;
}

export async function saveReport(row: Omit<ReportRow, "createdAt">): Promise<void> {
  await getPool().query(
    `INSERT INTO reports (domain, prompts_json, score, fixes, status, paid, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (domain) DO UPDATE SET
       prompts_json = EXCLUDED.prompts_json,
       score = EXCLUDED.score,
       fixes = EXCLUDED.fixes,
       status = EXCLUDED.status,
       created_at = NOW()`,
    [row.domain, JSON.stringify(row.promptsJson), row.score, JSON.stringify(row.fixes), row.status, row.paid],
  );
}

/** Gate reads: has this domain paid? */
export async function isPaid(domain: string): Promise<boolean> {
  const { rows } = await getPool().query<{ paid: boolean }>(
    "SELECT paid FROM reports WHERE domain = $1",
    [domain],
  );
  return rows[0]?.paid ?? false;
}

/** Webhook + verify writes: mark paid, creating a placeholder row if needed. */
export async function markPaid(domain: string): Promise<void> {
  await getPool().query(
    `INSERT INTO reports (domain, prompts_json, score, fixes, status, paid, created_at)
     VALUES ($1, '[]', 0, '[]', 'pending', TRUE, NOW())
     ON CONFLICT (domain) DO UPDATE SET paid = TRUE`,
    [domain],
  );
}
