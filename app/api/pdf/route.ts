import { NextResponse } from "next/server";
import { infra } from "@/lib/http";
import { buildPdf } from "@/lib/pdf";
import { getByShareToken } from "@/lib/store";

/** PDF artifact of the paid report — token-gated, paid-only, never cached. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    const row = await getByShareToken(token);
    if (!row || !row.paid || !row.reportJson) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const pdf = await buildPdf(row.reportJson, row.createdAt.toISOString().slice(0, 10));
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="cited-${row.domain}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return infra();
  }
}
