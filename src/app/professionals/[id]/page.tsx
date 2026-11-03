import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ReportButton } from "@/components/report-button";
import { Card } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { bookingText } from "@/lib/bookings-text";
import { getLocale } from "@/lib/i18n/server";
import { socialText } from "@/lib/social-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Professional" };

export default async function ProfessionalPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) notFound();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = socialText[l];
  if (user.mock || !isSupabaseConfigured())
    return <Alert kind="info">{bookingText[l].needsSupabase}</Alert>;

  const supabase = await createSupabaseServerClient();
  const { data: pro } = await supabase
    .from("professional_profiles")
    .select(
      "category_id, experience_years, bio, price_min_inr, price_max_inr, city, area_label, service_radius_km, is_available, verification_status, rating_avg, rating_count",
    )
    .eq("user_id", id.data)
    .maybeSingle(); // RLS: only listed professionals (or yourself) are visible
  if (!pro) notFound();
  const [{ data: person }, { data: cat }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", id.data).maybeSingle(),
    pro.category_id
      ? supabase
          .from("categories")
          .select("name_hi, name_en")
          .eq("id", pro.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at")
      .eq("professional_id", id.data)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const canBook = user.role === "customer" || user.role === "business";
  const price =
    pro.price_min_inr != null || pro.price_max_inr != null
      ? `₹${pro.price_min_inr ?? "…"}–${pro.price_max_inr ?? "…"}`
      : null;
  const fmt = new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="space-y-5">
      <Link href="/search" className="text-sm font-semibold text-brand-600">
        ← {t.back}
      </Link>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-navy-900">{person?.full_name ?? "—"}</h1>
          {pro.verification_status === "verified" && <Badge tone="verified">✓</Badge>}
        </div>
        <p className="text-sm text-muted">
          {[cat ? (l === "hi" ? cat.name_hi : cat.name_en) : null, pro.area_label, pro.city]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="text-sm">
          {pro.rating_avg != null && pro.rating_count > 0
            ? `★ ${Number(pro.rating_avg).toFixed(1)} (${pro.rating_count})`
            : t.noReviews}
          {price && ` · ${price}`}
          {pro.experience_years != null && ` · ${pro.experience_years} ${t.years}`}
        </p>
        <p className="text-sm text-muted">
          {t.away}: {pro.service_radius_km} {t.km}
        </p>
        {pro.bio && <p className="whitespace-pre-wrap break-words pt-1">{pro.bio}</p>}
        {canBook && (
          <Link
            href={`/bookings/new?pro=${id.data}`}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white"
          >
            {t.requestService}
          </Link>
        )}
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy-900">{t.reviews}</h2>
        {(reviews ?? []).length === 0 && <p className="text-sm text-muted">{t.noReviews}</p>}
        {(reviews ?? []).map((r) => (
          <Card key={r.id} className="space-y-1">
            <p className="font-semibold">
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)}{" "}
              <span className="text-sm font-normal text-muted">
                · {t.verifiedCustomer} · {fmt.format(new Date(r.created_at))}
              </span>
            </p>
            {r.comment && <p className="whitespace-pre-wrap break-words text-sm">{r.comment}</p>}
            <ReportButton targetType="review" targetId={r.id} text={t} />
          </Card>
        ))}
      </section>
    </div>
  );
}
