import type { Metadata } from "next";
import { setVerification } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Card } from "@/components/ui/card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: professionals" };
type Row = {
  user_id: string;
  full_name: string | null;
  email: string;
  city: string | null;
  verification_status: string;
  is_listed: boolean;
  rating_avg: number | null;
  rating_count: number;
  doc_count: number;
};

export default async function AdminProfessionals() {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_professionals");
  if (error) return <Alert kind="error">Could not load professionals.</Alert>;
  const rows = (data ?? []) as Row[];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Professional verification</h1>
      <Alert kind="info">
        Document upload for professionals is not built yet, so &quot;documents&quot; is usually 0.
        Verify only after checking identity outside the app.
      </Alert>
      {rows.length === 0 && <EmptyState title="No professionals yet" />}
      {rows.map((r) => (
        <Card key={r.user_id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-navy-900">{r.full_name ?? "—"}</p>
            <Badge
              tone={
                r.verification_status === "verified"
                  ? "verified"
                  : r.verification_status === "pending"
                    ? "pending"
                    : "neutral"
              }
            >
              {r.verification_status}
            </Badge>
          </div>
          <p className="break-all text-sm text-muted">
            {r.email} · {r.city ?? "no city"} · {r.is_listed ? "listed" : "not listed"} · documents:{" "}
            {r.doc_count} ·{" "}
            {r.rating_avg != null ? `★ ${r.rating_avg} (${r.rating_count})` : "no reviews"}
          </p>
          <div className="flex flex-wrap gap-2">
            {r.verification_status !== "verified" && (
              <ConfirmSubmit
                action={setVerification}
                fields={{ user_id: r.user_id, status: "verified" }}
                label="Verify"
              />
            )}
            {r.verification_status !== "rejected" && (
              <ConfirmSubmit
                action={setVerification}
                fields={{ user_id: r.user_id, status: "rejected" }}
                label="Reject"
                danger
              />
            )}
            {r.verification_status !== "unverified" && (
              <ConfirmSubmit
                action={setVerification}
                fields={{ user_id: r.user_id, status: "unverified" }}
                label="Reset"
                danger
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
