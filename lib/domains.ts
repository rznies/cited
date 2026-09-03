/**
 * Shared domain normalization — one rule for every route. Accepts bare
 * domains AND pasted URLs (strips scheme, port, path, query): buyers paste
 * `https://example.com/pricing`, we audit `example.com`.
 */
export function cleanDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^[^@\s]+@/, "");
  d = d.split(/[/?#]/)[0].split(":")[0].replace(/\.+$/, "");
  d = d.slice(0, 253);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}
