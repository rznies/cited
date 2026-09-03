/** Shared domain normalization — one rule for every route. */
export function cleanDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const d = raw.trim().toLowerCase().slice(0, 253);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}
