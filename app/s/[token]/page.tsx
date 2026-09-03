import { notFound } from "next/navigation";
import ReportFull from "@/components/ReportFull";
import { getByShareToken } from "@/lib/store";

/** Buyer-shareable paid link — token-gated, no login, teaser stays separate. */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await getByShareToken(token).catch(() => null);
  if (!row || !row.paid || !row.reportJson) notFound();
  return (
    <main className="wrap">
      <ReportFull report={row.reportJson} paidOn={row.createdAt.toISOString().slice(0, 10)} />
      <p className="small muted">
        Shared paid audit from cited — the free teaser lives on the home page.
      </p>
    </main>
  );
}
