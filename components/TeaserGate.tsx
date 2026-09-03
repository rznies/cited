"use client";

// $29 gate via Razorpay checkout.js (Ticket 3a) + Ticket 3b resilience:
// order → modal (UPI + cards) → server-side signature verify → unlock.
// Paid-but-unconfirmed buyers auto-unlock via paid-state polling (webhook can
// land after the modal closes). Full report is fetched AFTER unlock and polls
// through cold runs; stale copies wear a cached banner. Paid content is never
// in the page payload pre-pay.
import { useEffect, useState } from "react";
import type { AuditReport } from "@/lib/types";

interface CheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayConstructor {
  new (options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    modal?: { ondismiss?: () => void };
    handler?: (response: CheckoutResponse) => void;
  }): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let checkoutScript: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!checkoutScript) {
    checkoutScript = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("checkout.js failed to load"));
      document.head.appendChild(s);
    });
  }
  return checkoutScript;
}

function priceLabel(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  } catch {
    return `${amount / 100} ${currency}`;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "locked" | "ordering" | "checking" | "verifying" | "confirming" | "unlocked" | "failed";

interface FullPayload {
  report: AuditReport;
  cached: boolean;
  ageH: number;
}

/** Fetches the paid report, polling through cold runs (202 pending). Bounded. */
async function fetchFull(domain: string, maxPolls = 30): Promise<FullPayload | null> {
  for (let i = 0; i < maxPolls; i += 1) {
    const res = await fetch(`/api/report?domain=${encodeURIComponent(domain)}`);
    if (res.status === 202) {
      await sleep(2000);
      continue;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as {
      report?: AuditReport;
      cached?: boolean;
      ageH?: number;
    };
    if (!data.report) return null;
    return { report: data.report, cached: data.cached === true, ageH: data.ageH ?? 0 };
  }
  return null;
}

/** Paid-state read — the webhook may have landed while the modal was away. */
async function fetchPaid(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/checkout?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) return false;
    return ((await res.json()) as { paid?: boolean }).paid === true;
  } catch {
    return false;
  }
}

export default function TeaserGate({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<Phase>("locked");
  const [full, setFull] = useState<FullPayload | null>(null);
  const [price, setPrice] = useState("₹2,499.00");
  const [currency, setCurrency] = useState("INR");
  const [shareUrl, setShareUrl] = useState("");
  const [shareNote, setShareNote] = useState("");
  const upi = currency === "INR";

  // Revisit-after-payment: webhook may have marked paid while browser was away.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!(await fetchPaid(domain))) return;
      const payload = await fetchFull(domain);
      if (live && payload) {
        setFull(payload);
        setPhase("unlocked");
      }
    })();
    return () => {
      live = false;
    };
  }, [domain]);

  /** Paid-but-unconfirmed: poll paid-state, auto-unlock when the webhook lands.
   *  Bounded (~30s); the inner fetch uses short polls so the worst case stays
   *  under ~2min, then surfaces retry. */
  async function confirmPaid(): Promise<boolean> {
    for (let i = 0; i < 10; i += 1) {
      await sleep(3000);
      if (await fetchPaid(domain)) {
        const payload = await fetchFull(domain, 3);
        if (payload) {
          setFull(payload);
          return true;
        }
      }
    }
    return false;
  }

  async function unlock() {
    setPhase("ordering");
    try {
      await loadCheckout();
      const orderRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (orderRes.status === 503) throw new Error("payments unavailable");
      const order = (await orderRes.json()) as {
        paid?: boolean;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.keyId) {
        if (order.paid === true) {
          const payload = await fetchFull(domain);
          if (payload) {
            setFull(payload);
            setPhase("unlocked");
            return;
          }
        }
        throw new Error("order failed");
      }
      setPrice(priceLabel(order.amount ?? 0, order.currency ?? "INR"));
      setCurrency(order.currency ?? "INR");
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("checkout unavailable");
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amount ?? 0,
        currency: order.currency ?? "INR",
        order_id: order.orderId,
        name: "cited",
        description: `AEO Visibility Audit — ${domain}`,
        modal: { ondismiss: () => setPhase("locked") },
        handler: async (response: CheckoutResponse) => {
          setPhase("verifying");
          try {
            const verifyRes = await fetch("/api/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                domain,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              const payload = await fetchFull(domain);
              if (payload) {
                setFull(payload);
                setPhase("unlocked");
                return;
              }
            }
            setPhase("confirming");
            setPhase((await confirmPaid()) ? "unlocked" : "failed");
          } catch {
            setPhase("failed");
          }
        },
      });
      rzp.open();
      setPhase("checking");
    } catch {
      setPhase("failed");
    }
  }

  async function mintShare() {
    setShareNote("");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) throw new Error("mint failed");
      const data = (await res.json()) as { url: string };
      setShareUrl(`${window.location.origin}${data.url}`);
    } catch {
      setShareNote("Couldn't mint the share link — retry.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setShareNote("Copied.");
    } catch {
      setShareNote(text);
    }
  }

  const report = full?.report ?? null;

  return (
    <>
      <div className="gate">
        <h3>Unlock full audit — {price} one-time</h3>
        <p className="small">
          10 prompts • who-beats-me + their pages • 5 fixes ordered by impact • PDF + share link
        </p>
        {phase === "locked" || phase === "failed" ? (
          <button className="btn" onClick={unlock}>
            {upi ? "Unlock with UPI / card" : "Unlock with card"}
          </button>
        ) : phase === "unlocked" ? (
          <p>
            <b>🔓 Unlocked.</b>
          </p>
        ) : (
          <p className="small">
            {phase === "ordering" && "Creating secure order…"}
            {phase === "checking" && "Complete payment in the Razorpay window…"}
            {phase === "verifying" && "Verifying payment…"}
            {phase === "confirming" && "Confirming payment — one moment…"}
          </p>
        )}
        {phase === "failed" && (
          <p className="small">
            Payment didn&apos;t go through.{" "}
            <button className="btn" onClick={unlock}>
              Retry
            </button>
          </p>
        )}
        <p className="small muted">
          Secured by Razorpay ({upi ? "UPI + cards" : "cards"}). Test mode.
        </p>
      </div>

      {phase !== "unlocked" || !report || !full ? (
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
            <h3>Share + PDF</h3>
            <p>
              <button
                className="btn"
                onClick={() =>
                  copy(`${window.location.origin}/?domain=${encodeURIComponent(domain)}`)
                }
              >
                Copy teaser link
              </button>{" "}
              <span className="small muted">public, free slice</span>
            </p>
            <p>
              {shareUrl ? (
                <>
                  <button className="btn" onClick={() => copy(shareUrl)}>
                    Copy paid link
                  </button>{" "}
                  <a className="small" href={`/api/pdf?token=${shareUrl.split("/s/")[1] ?? ""}`}>
                    Download PDF
                  </a>
                </>
              ) : (
                <button className="btn" onClick={mintShare}>
                  Mint paid share link
                </button>
              )}{" "}
              <span className="small muted">buyer-shareable, never leaks to teaser</span>
            </p>
            {shareNote && <p className="small">{shareNote}</p>}
          </div>
          {full.cached && full.ageH >= 1 && (
            <div className="card">
              <span className="small">
                📦 Cached {full.ageH}h ago • Fresh check every 24h — showing cached report, not an
                error.
              </span>
            </div>
          )}
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
