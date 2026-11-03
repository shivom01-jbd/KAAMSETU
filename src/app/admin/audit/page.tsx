import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: audit log" };

export default async function AdminAudit() {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_audit_logs")
    .select("id, action, target_type, target_id, details, created_at")
    .order("id", { ascending: false })
    .limit(100);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Audit log</h1>
      {(data ?? []).length === 0 && <EmptyState title="No admin actions yet" />}
      <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-50">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target</th>
              <th className="p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap p-2">{fmt.format(new Date(r.created_at))}</td>
                <td className="p-2 font-semibold">{r.action}</td>
                <td className="break-all p-2">
                  {r.target_type}:{r.target_id.slice(0, 8)}
                </td>
                <td className="break-all p-2 text-muted">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
