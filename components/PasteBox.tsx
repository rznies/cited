"use client";

// Paste-box (Ticket 4): any ChatGPT answer → structured scorePaste result.
// Stateless: text persists in localStorage only, zero report-store rows.
// Rule-based v1 heuristic — labeled as such, never a live-ChatGPT claim.
import { useEffect, useState } from "react";
import type { PasteScore } from "@/lib/types";

export default function PasteBox({ domain }: { domain: string }) {
  const key = `cited-paste-${domain}`;
  const [text, setText] = useState("");
  const [result, setResult] = useState<PasteScore | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setText(window.localStorage.getItem(key) ?? "");
    } catch {
      /* private mode — unpersisted */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function onChange(v: string) {
    setText(v);
    try {
      window.localStorage.setItem(key, v);
    } catch {
      /* private mode — unpersisted */
    }
  }

  async function score() {
    setScoring(true);
    setError("");
    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, domain }),
      });
      if (!res.ok) throw new Error("score failed");
      const data = (await res.json()) as { result: PasteScore };
      setResult(data.result);
    } catch {
      setError("Couldn't score that paste — retry.");
    } finally {
      setScoring(false);
    }
  }

  return (
    <div className="card">
      <h3>ChatGPT paste-box</h3>
      <p className="small muted">
        No fake live ChatGPT. Paste any ChatGPT answer → structured rule-based v1 score.
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste ChatGPT answer here…"
        aria-label="Pasted ChatGPT answer"
        rows={5}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={score} disabled={scoring || text.trim() === ""}>
          {scoring ? "Scoring…" : "Score my paste"}
        </button>
      </div>
      {error && <p className="small">{error}</p>}
      {result && (
        <div className="card">
          <div className="hero-score">
            {result.score}
            <span style={{ fontSize: 18, color: "var(--muted)" }}>/100</span>
          </div>
          <p className="small">
            Mentioned: <b>{result.mentioned ? "yes" : "no"}</b> • {result.rankHint}
            {result.competitorsFound.length > 0 &&
              ` • rivals: ${result.competitorsFound.join(", ")}`}
          </p>
          <p className="small">One fix: {result.oneFix}</p>
        </div>
      )}
    </div>
  );
}
