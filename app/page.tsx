// V2 who-beats-me-first shell (Ticket 1): winners lead, both scores underneath,
// teaser free, full report behind the gate. Paste-box lands in Ticket 4,
// share/PDF in Ticket 5. All data stubbed via lib/seams.
import PasteBox from "@/components/PasteBox";
import TeaserGate from "@/components/TeaserGate";
import { MOCK_DOMAIN } from "@/lib/mock";
import { generateReport } from "@/lib/seams";
import type { AuditReport } from "@/lib/types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const raw = (await searchParams).domain?.trim();
  const domain = raw ? raw.slice(0, 253) : MOCK_DOMAIN;
  let report: AuditReport | null = null;
  try {
    report = await generateReport(domain);
  } catch {
    report = null;
  }
  if (!report) {
    return (
      <main className="wrap">
        <div className="card">
          <h2>Audit unavailable right now</h2>
          <p className="small muted">
            The visibility check blipped (usually a rate limit — wait a minute and retry).
            Nothing was charged, nothing was stored.
          </p>
          <p>
            <a className="btn" href={`/?domain=${encodeURIComponent(domain)}`}>
              Retry
            </a>
          </p>
        </div>
        <PasteBox domain={domain} />
      </main>
    );
  }
  const teaser = report.prompts.slice(0, 2);

  return (
    <main className="wrap">
      <div className="card">
        <div className="small muted">DOMAIN (no login)</div>
        <form method="GET">
          <input
            className="domain"
            name="domain"
            defaultValue={domain}
            aria-label="Domain"
            maxLength={253}
          />
          <p>
            <button className="btn" type="submit">
              Get teaser
            </button>
          </p>
        </form>
        <p className="small muted">
          Does Google AI + ChatGPT recommend me, and who beats me? 60-sec honest audit.
        </p>
      </div>

      <div className="card">
        <h3>
          Who beats you <span className="mock-tag">MOCK</span>
        </h3>
        <p className="small muted">
          {report.winners.map((w) => `${w.name} ${w.cites}/10`).join(", ")} — you{" "}
          {report.citationPct}% ({report.prompts.filter((p) => p.cited).length}/
          {report.prompts.length} prompts). The score is the consequence:
        </p>
        <div className="dual">
          <div className="score-pill">
            <div className="small muted">WEB VISIBILITY (MOCK)</div>
            <div className="hero-score">
              {report.webScore}
              <span style={{ fontSize: 18, color: "var(--muted)" }}>/100</span>
            </div>
            <div className="small">Cited in {report.citationPct}% (3/10 prompts)</div>
          </div>
          <div className="score-pill">
            <div className="small muted">CHATGPT PASTE SCORE</div>
            <div className="hero-score">
              –<span style={{ fontSize: 18, color: "var(--muted)" }}>/100</span>
            </div>
            <div className="small">Paste your ChatGPT answer below — never faked live</div>
          </div>
        </div>
        <p className="small muted">Two scores, never blended. Mock data.</p>
      </div>

      <div className="card">
        <h3>
          Teaser — free (2/10 prompts) <span className="mock-tag">MOCK</span>
        </h3>
        <table>
          <thead>
            <tr>
              <th>Buyer prompt</th>
              <th>You cited?</th>
            </tr>
          </thead>
          <tbody>
            {teaser.map((p) => (
              <tr key={p.text}>
                <td>{p.text}</td>
                <td>{p.cited ? `✅ ${p.citedBy}` : "❌ not cited"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Full 10 prompts + winners + fixes behind $29.</p>
      </div>

      <TeaserGate domain={domain} />

      <PasteBox domain={domain} />
    </main>
  );
}
