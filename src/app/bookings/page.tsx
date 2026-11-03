import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookingCard, type BookingRow } from "@/components/booking-card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { bookingText } from "@/lib/bookings-text";
import { actorKind, isOpen, type BookingStatus } from "@/lib/bookings/transitions";
import { getLocale } from "@/lib/i18n/server";
import { socialText } from "@/lib/social-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bookings" };

export default async function Bookings() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = bookingText[l];
  const social = socialText[l];
  const title = user.role === "professional" ? t.jobRequests : t.myBookings;
  if (user.mock || !isSupabaseConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
        <Alert kind="info">{t.needsSupabase}</Alert>
      </div>
    );
  }
  const supabase = await createSupabaseServerClient();
  // RLS returns only bookings where the caller is the customer, the professional, or an admin.
  const { data: rows } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, professional_id, category_id, description, preferred_at, area_label, status",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const list = rows ?? [];
  const otherIds = [
    ...new Set(list.map((b) => (b.customer_id === user.id ? b.professional_id : b.customer_id))),
  ];
  const [{ data: people }, { data: cats }] = await Promise.all([
    otherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", otherIds)
      : Promise.resolve({ data: [] }),
    supabase.from("categories").select("id, name_hi, name_en"),
  ]);
  const { data: reviewed } = list.length
    ? await supabase
        .from("reviews")
        .select("booking_id")
        .in(
          "booking_id",
          list.map((b) => b.id),
        )
    : { data: [] };
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.booking_id));
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name ?? "—"]));
  const cat = new Map((cats ?? []).map((c) => [c.id, l === "hi" ? c.name_hi : c.name_en]));

  const cards = list.flatMap((b) => {
    const kind = actorKind(user.id, b, user.role);
    if (!kind) return [];
    const other = kind === "professional" ? b.customer_id : b.professional_id;
    const row: BookingRow = {
      id: b.id,
      status: b.status as BookingStatus,
      description: b.description,
      preferred_at: b.preferred_at,
      area_label: b.area_label,
      category_name: b.category_id ? cat.get(b.category_id) : undefined,
      counterparty: name.get(other),
      reviewed: reviewedIds.has(b.id),
    };
    return [{ row, kind }];
  });
  const section = (heading: string, items: typeof cards) => (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-navy-900">{heading}</h2>
      {items.length === 0 ? (
        <EmptyState title={t.none} />
      ) : (
        items.map(({ row, kind }) => (
          <BookingCard key={row.id} b={row} kind={kind} locale={l} text={t} social={social} />
        ))
      )}
    </section>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
      {section(
        t.active,
        cards.filter((c) => isOpen(c.row.status)),
      )}
      {section(
        t.history,
        cards.filter((c) => !isOpen(c.row.status)),
      )}
    </div>
  );
}
