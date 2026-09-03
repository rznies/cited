// V2 who-beats-me-first shell (Ticket 1): winners lead, both scores underneath,
// teaser free, full report behind the gate. Paste-box lands in Ticket 4,
// share/PDF in Ticket 5. All data stubbed via lib/seams.
import TeaserGate from "@/components/TeaserGate";
import { MOCK_DOMAIN } from "@/lib/mock";
import { generateReport } from "@/lib/seams";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>;
}) {
  const raw = (await searchParams).domain?.trim();
  const domain = raw ? raw.slice(0, 253) : MOCK_DOMAIN;
  const report = await generateReport(domain);
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
          FollowUpBoss 9/10, HubSpot 7/10, Zoho 5/10 — you 3/10. The score is the
          consequence:
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
            <div className="small">Paste-box lands in Ticket 4 — never faked live</div>
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
    </main>
  );
}
