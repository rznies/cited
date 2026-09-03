"use client";

// Route boundary: provider blips (429s, outages) become a retry card,
// never the raw "Application error" page.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="wrap">
      <div className="card">
        <h2>Audit unavailable right now</h2>
        <p className="small muted">
          The visibility check blipped (usually a rate limit — wait a minute). Nothing was
          charged, nothing was stored.
          {error.digest ? ` Ref: ${error.digest}.` : ""}
        </p>
        <p>
          <button className="btn" onClick={reset}>
            Retry
          </button>
        </p>
      </div>
    </main>
  );
}
