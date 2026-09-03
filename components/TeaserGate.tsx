"use client";

// MOCK gate (Ticket 3a builds the real Stripe gate): toggles the stubbed full
// report locally. Full content never renders before this toggle — the V3
// blurred-before-gate leak stays dead.
import { useState } from "react";
import type { AuditReport } from "@/lib/types";

export default function TeaserGate({ report }: { report: AuditReport }) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <>
      <div className="gate">
        <h3>
          Unlock full audit — $29 one-time <span className="mock-tag">MOCK</span>
        </h3>
        <p className="small">
          10 prompts • who-beats-me + their pages • 5 fixes ordered by impact • PDF + share link
        </p>
        <button className="btn" onClick={() => setUnlocked(true)}>
          Unlock for $29 (mock)
        </button>
        <p className="small muted">Real Stripe checkout lands in Ticket 3a.</p>
      </div>

      {!unlocked ? (
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
                {report.winners.map((w) => (
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
                  <td>{report.extract.hasFAQ ? "✅" : "❌"}</td>
                  <td>Pricing table</td>
                  <td>{report.extract.hasPricingTable ? "✅" : "❌"}</td>
                </tr>
                <tr>
                  <td>Schema.org</td>
                  <td>{report.extract.hasSchema ? "✅" : "❌"}</td>
                  <td>llms.txt</td>
                  <td>{report.extract.hasLlmsTxt ? "✅" : "❌"}</td>
                </tr>
                <tr>
                  <td colSpan={4}>
                    Words: you {report.extract.wordCount} vs winners avg{" "}
                    {report.extract.winnerAvgWords}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>5 fixes, impact order (dev-shippable in a day)</h3>
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
      )}
    </>
  );
}
