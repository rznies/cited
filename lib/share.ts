// Buyer-shareable paid links — opaque tokens, no data in the URL.
import { randomBytes } from "node:crypto";

/** 256-bit hex token for /s/[token] + /api/pdf. */
export function newShareToken(): string {
  return randomBytes(32).toString("hex");
}
