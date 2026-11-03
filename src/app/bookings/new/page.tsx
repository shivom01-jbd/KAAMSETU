import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BookingForm } from "@/components/booking-form";
import { Alert } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { bookingText } from "@/lib/bookings-text";
import { getLocale } from "@/lib/i18n/server";
import { searchText } from "@/lib/search-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Request a service" };

export default async function NewBooking({
  searchParams,
}: {
  searchParams: Promise<{ pro?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = bookingText[l];
  const head = <h1 className="text-2xl font-extrabold text-navy-900">{t.newTitle}</h1>;
  if (user.role !== "customer" && user.role !== "business")
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="error">{t.onlyCustomers}</Alert>
      </div>
    );
  if (user.mock || !isSupabaseConfigured())
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="info">{t.needsSupabase}</Alert>
      </div>
    );

  const id = z
    .string()
    .uuid()
    .safeParse((await searchParams).pro);
  if (!id.success)
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="error">{t.proNotFound}</Alert>
      </div>
    );
  const supabase = await createSupabaseServerClient();
  const { data: pro } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", id.data)
    .maybeSingle();
  if (!pro)
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="error">{t.proNotFound}</Alert>
      </div>
    );
  return (
    <div className="space-y-5">
      {head}
      <p className="text-muted">
        {t.with}: <strong>{pro.full_name ?? "—"}</strong>
      </p>
      <BookingForm professionalId={pro.id} text={t} locText={searchText[l]} />
    </div>
  );
}
