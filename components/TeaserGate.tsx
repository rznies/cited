"use client";

// MOCK gate (Ticket 3a builds the real Stripe gate): full report is fetched
// AFTER the toggle from /api/report, so paid content is never in the page
// payload pre-pay. Nothing renders before unlock — locked means not rendered.
import { useState } from "react";
import type { AuditReport } from "@/lib/types";

export default function TeaserGate({ domain }: { domain: string }) {
  const [unlocked, setUnlocked] = useState(false);
  const [full, setFull] = useState<AuditReport | null>(null);
  const [failed, setFailed] = useState(false);

  async function unlock() {
    setFailed(false);
    try {
      const res = await fetch(`/api/report?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) throw new Error("mock fetch failed");
      const data = (await res.json()) as { report: AuditReport };
      setFull(data.report);
      setUnlocked(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <div className="gate">
        <h3>
          Unlock full audit — $29 one-time <span className="mock-tag">MOCK</span>
        </h3>
        <p className="small">
          10 prompts • who-beats-me + their pages • 5 fixes ordered by impact • PDF + share link
        </p>
        <button className="btn" onClick={unlock}>
          Unlock for $29 (mock)
        </button>
        {failed && (
          <p className="small">
            Mock fetch failed. <button onClick={unlock}>Retry</button>
          </p>
        )}
        <p className="small muted">Real Stripe checkout lands in Ticket 3a.</p>
      </div>

      {!unlocked || !full ? (
        <div className="card">
          <b>🔒 Full report locked.</b>{" "}
          <span className="muted">
            10 prompts, winners&apos; pages, checklist and 5 fixes unlock after payment. Nothing
            hidden behind blur — locked means not rendered.
          </span>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>
              All 10 prompts tested <span className="mock-tag">MOCK DATA</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Cited?</th>
                  <th>Your page</th>
                </tr>
              </thead>
              <tbody>
                {full.prompts.map((p, i) => (
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
            <h3>Who beats you + pages to copy</h3>
            <table>
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Their page</th>
                  <th>Cites</th>
                </tr>
              </thead>
              <tbody>
                {full.winners.map((w) => (
                  <tr key={w.name}>
                    <td>
                      <b>{w.name}</b>
                    </td>
                    <td className="small">{w.page}</td>
                    <td>{w.cites}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Checklist (extracted)</h3>
            <table>
              <tbody>
                <tr>
                  <td>FAQ</td>
                  <td>{full.extract.hasFAQ ? "✅" : "❌"}</td>
                  <td>Pricing table</td>
                  <td>{full.extract.hasPricingTable ? "✅" : "❌"}</td>
                </tr>
                <tr>
                  <td>Schema.org</td>
                  <td>{full.extract.hasSchema ? "✅" : "❌"}</td>
                  <td>llms.txt</td>
                  <td>{full.extract.hasLlmsTxt ? "✅" : "❌"}</td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Words: you {full.extract.wordCount} vs winners avg{" "}
                    {full.extract.winnerAvgWords}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>5 fixes, impact order (dev-shippable in a day)</h3>
            {full.fixes.map((f, i) => (
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
      )}
    </>
  );
}
