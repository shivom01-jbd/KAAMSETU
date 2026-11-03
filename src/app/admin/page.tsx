import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };
type Stats = {
  users_by_role: Record<string, number>;
  bookings_by_status: Record<string, number>;
  pending_verifications: number;
  open_reports: number;
  reviews_total: number;
  reviews_hidden: number;
};

export default async function AdminHome() {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error || !data)
    return (
      <Alert kind="error">
        Could not load statistics. Run 0005_admin_dashboard.sql in Supabase.
      </Alert>
    );
  const s = data as unknown as Stats;
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + Number(b), 0);
  const tiles: [string, number | string, string?][] = [
    ["Users", sum(s.users_by_role)],
    ["Bookings", sum(s.bookings_by_status)],
    ["Pending verifications", s.pending_verifications, "/admin/professionals"],
    ["Open reports", s.open_reports, "/admin/reports"],
    ["Reviews", s.reviews_total],
    ["Hidden reviews", s.reviews_hidden],
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-navy-900">Platform overview</h1>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([label, n, href]) => (
          <Card key={label}>
            <p className="text-3xl font-extrabold text-navy-900">{n}</p>
            <p className="text-sm text-muted">
              {href ? (
                <Link href={href} className="underline">
                  {label}
                </Link>
              ) : (
                label
              )}
            </p>
          </Card>
        ))}
      </div>
      <Card className="space-y-1 text-sm">
        <p className="font-bold text-navy-900">Users by role</p>
        <p>
          {Object.entries(s.users_by_role)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "none"}
        </p>
        <p className="pt-2 font-bold text-navy-900">Bookings by status</p>
        <p>
          {Object.entries(s.bookings_by_status)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "none"}
        </p>
      </Card>
    </div>
  );
}
