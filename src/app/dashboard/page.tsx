import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvailabilityToggle } from "@/components/availability-toggle";
import { UnreadMessagesLink } from "@/components/unread-messages-link";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-text";
import { getLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };
type Stats = Record<
  | "pro_requested"
  | "pro_active"
  | "pro_completed"
  | "pro_completed_month"
  | "cus_active"
  | "cus_completed",
  number
>;
const btn =
  "inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-line bg-white font-semibold text-navy-900";

function Tile({ n, label }: { n: number | string; label: string }) {
  return (
    <Card>
      <p className="text-3xl font-extrabold text-navy-900">{n}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = dashboardText[l];
  const head = <h1 className="text-2xl font-extrabold text-navy-900">{t.title}</h1>;
  if (user.mock || !isSupabaseConfigured())
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="info">{t.needsSupabase}</Alert>
      </div>
    );

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_dashboard_stats");
  const s = (data ?? {}) as Partial<Stats>;
  const n = (k: keyof Stats) => Number(s[k] ?? 0);
  let pro: { is_available: boolean; rating_avg: number | null; rating_count: number } | null = null;
  if (user.role === "professional") {
    const { data: p } = await supabase
      .from("professional_profiles")
      .select("is_available, rating_avg, rating_count")
      .eq("user_id", user.id)
      .maybeSingle();
    pro = p;
  }
  return (
    <div className="space-y-5">
      {head}
      {user.role === "professional" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile n={n("pro_requested")} label={t.pending} />
            <Tile n={n("pro_active")} label={t.active} />
            <Tile n={n("pro_completed_month")} label={t.doneMonth} />
            <Tile n={n("pro_completed")} label={t.doneTotal} />
          </div>
          <Tile
            n={
              pro?.rating_avg != null && pro.rating_count > 0
                ? `★ ${Number(pro.rating_avg).toFixed(1)} (${pro.rating_count})`
                : "—"
            }
            label={pro?.rating_count ? t.rating : t.noRating}
          />
          {pro && (
            <Card>
              <AvailabilityToggle
                available={pro.is_available}
                onLabel={t.available}
                offLabel={t.unavailable}
                actionLabel={pro.is_available ? t.makeBusy : t.makeAvailable}
                error={t.failed}
              />
            </Card>
          )}
          <Alert kind="info">
            <strong>{t.earningsTitle}:</strong> {t.earningsNote}
          </Alert>
          <Link href="/bookings" className={btn}>
            {t.jobRequests}
          </Link>
        </>
      )}
      {(user.role === "customer" || user.role === "business") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile n={n("cus_active")} label={t.myActive} />
            <Tile n={n("cus_completed")} label={t.myDone} />
          </div>
          <Link
            href="/search"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white"
          >
            {t.findPros}
          </Link>
          <Link href="/bookings" className={btn}>
            {t.bookings}
          </Link>
        </>
      )}
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy-900 font-semibold text-white"
        >
          {t.adminPanel}
        </Link>
      )}
      <UnreadMessagesLink locale={l} mock={user.mock} />
      <Link href="/account" className={btn}>
        {t.profile}
      </Link>
    </div>
  );
}
