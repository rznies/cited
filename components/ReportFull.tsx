// Full paid report — server-rendered presentational copy for the share page.
// Payment-proof chip is proof-of-payment only, never a quality endorsement
// (TrustMRR wiring is a manual day-1 step, not claimed here).
import type { AuditReport } from "@/lib/types";

export default function ReportFull({ report, paidOn }: { report: AuditReport; paidOn: string }) {
  return (
    <>
      <div className="card">
        <span className="mock-tag">✓ Paid audit — payment verified {paidOn}</span>
        <h2 style={{ margin: "8px 0" }}>{report.domain}</h2>
        <div className="dual">
          <div className="score-pill">
            <div className="small muted">WEB VISIBILITY</div>
            <div className="hero-score">
              {report.webScore}
              <span style={{ fontSize: 18, color: "var(--muted)" }}>/100</span>
            </div>
            <div className="small">Cited in {report.citationPct}% of prompts</div>
          </div>
          <div className="score-pill">
            <div className="small muted">WHO BEATS YOU</div>
            <div className="small">
              {report.winners.map((w) => `${w.name} ${w.cites}/10`).join(" • ")}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>All 10 prompts tested</h3>
        <table>
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Cited?</th>
              <th>Your page</th>
            </tr>
          </thead>
          <tbody>
            {report.prompts.map((p, i) => (
              <tr key={i}>
                <td>
                  {i + 1}. {p.text}
                </td>
                <td>{p.cited ? "✅" : "❌"}</td>
                <td className="small muted">{p.citedBy ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>5 fixes, impact order</h3>
        {report.fixes.map((f, i) => (
          <div className="fix" key={i}>
            <span className="mock-tag">
              #{i + 1} {f.impact}
            </span>{" "}
            <b>{f.title}</b> <span className="small muted">({f.effort})</span>
            <div className="small">{f.detail}</div>
          </div>
        ))}
      </div>
    </>
  );
}
