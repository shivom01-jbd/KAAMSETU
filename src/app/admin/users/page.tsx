import type { Metadata } from "next";
import { setSuspended } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin: users" };
type Row = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  is_suspended: boolean;
  created_at: string;
};

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin(); // pages render in parallel with the layout, so each page checks too
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: q || null,
    p_limit: 50,
  });
  if (error) return <Alert kind="error">Could not load users.</Alert>;
  const rows = (data ?? []) as Row[];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-navy-900">Users</h1>
      <form
        method="get"
        className="space-y-2 rounded-(--radius-card) border border-line bg-white p-4"
      >
        <Input label="Search by name or email" name="q" defaultValue={q} />
        <Button type="submit">Search</Button>
      </form>
      {rows.length === 0 && <EmptyState title="No users found" />}
      {rows.map((u) => (
        <Card key={u.id} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-navy-900">{u.full_name ?? "—"}</p>
            <div className="flex gap-2">
              <Badge>{u.role}</Badge>
              {u.is_suspended && <Badge tone="pending">suspended</Badge>}
            </div>
          </div>
          <p className="break-all text-sm text-muted">{u.email}</p>
          {u.role !== "admin" && (
            <ConfirmSubmit
              action={setSuspended}
              fields={{ user_id: u.id, suspended: String(!u.is_suspended) }}
              label={u.is_suspended ? "Unsuspend" : "Suspend"}
              danger={!u.is_suspended}
              body={
                u.is_suspended
                  ? "The user can use the platform again."
                  : "The user is signed out of all features and cannot book, chat or review."
              }
            />
          )}
        </Card>
      ))}
    </div>
  );
}
