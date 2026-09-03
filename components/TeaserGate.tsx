"use client";

// $29 gate via Razorpay checkout.js (Ticket 3a): order → modal (UPI + cards) →
// server-side signature verify → full report fetched AFTER unlock, so paid
// content is never in the page payload pre-pay.
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

type Phase = "locked" | "checking" | "ordering" | "verifying" | "unlocked" | "failed";

export default function TeaserGate({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<Phase>("locked");
  const [full, setFull] = useState<AuditReport | null>(null);
  const [price, setPrice] = useState("₹2,499.00");

  async function fetchFull(): Promise<boolean> {
    const res = await fetch(`/api/report?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) return false;
    const data = (await res.json()) as { report: AuditReport };
    setFull(data.report);
    return true;
  }

  // Revisit-after-payment: webhook may have marked paid while browser was away.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/checkout?domain=${encodeURIComponent(domain)}`);
        const data = (await res.json()) as { paid?: boolean };
        if (live && data.paid === true && (await fetchFull())) setPhase("unlocked");
      } catch {
        /* offline — stays locked, retry via button */
      }
    })();
    return () => {
      live = false;
    };
  }, [domain]);

  async function unlock() {
    setPhase("ordering");
    try {
      await loadCheckout();
      const orderRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const order = (await orderRes.json()) as {
        paid?: boolean;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.keyId) {
        if (order.paid === true && (await fetchFull())) {
          setPhase("unlocked");
          return;
        }
        throw new Error("order failed");
      }
      setPrice(priceLabel(order.amount ?? 0, order.currency ?? "INR"));
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
            if (!verifyRes.ok || !(await fetchFull())) throw new Error("verify failed");
            setPhase("unlocked");
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

  return (
    <>
      <div className="gate">
        <h3>Unlock full audit — {price} one-time</h3>
        <p className="small">
          10 prompts • who-beats-me + their pages • 5 fixes ordered by impact • PDF + share link
        </p>
        {phase === "locked" || phase === "failed" ? (
          <button className="btn" onClick={unlock}>
            Unlock with UPI / card
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
        <p className="small muted">Secured by Razorpay (UPI + cards). Test mode.</p>
      </div>

      {phase !== "unlocked" || !full ? (
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
