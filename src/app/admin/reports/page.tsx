import type { Metadata } from "next";
import { resolveReport } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Card } from "@/components/ui/card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: reports" };
type Row = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string | null;
  preview: string | null;
};

export default async function AdminReports() {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_reports", { p_status: "open" });
  if (error) return <Alert kind="error">Could not load reports.</Alert>;
  const rows = (data ?? []) as Row[];
  const fmt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Open reports</h1>
      <Alert kind="info">
        You see the text of a message or review only because it was reported. Every action is
        written to the audit log.
      </Alert>
      {rows.length === 0 && <EmptyState title="No open reports" />}
      {rows.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="pending">{r.target_type}</Badge>
            <span className="text-xs text-muted">
              {fmt.format(new Date(r.created_at))} · by {r.reporter_name ?? "—"}
            </span>
          </div>
          <p className="text-sm">
            <strong>Reason:</strong> {r.reason}
          </p>
          <p className="whitespace-pre-wrap break-words rounded-xl bg-brand-50 p-3 text-sm">
            <strong>Reported content:</strong> {r.preview ?? "(no longer available)"}
          </p>
          <div className="flex flex-wrap gap-2">
            {r.target_type === "review" && (
              <ConfirmSubmit
                action={resolveReport}
                fields={{ report_id: r.id, status: "reviewed", hide: "true" }}
                label="Hide review and close"
                danger
                body="The review disappears from the professional's page and their rating is recalculated."
              />
            )}
            <ConfirmSubmit
              action={resolveReport}
              fields={{ report_id: r.id, status: "reviewed", hide: "false" }}
              label="Mark reviewed"
            />
            <ConfirmSubmit
              action={resolveReport}
              fields={{ report_id: r.id, status: "dismissed", hide: "false" }}
              label="Dismiss"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
