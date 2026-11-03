import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "@/components/profile-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import { authText } from "@/lib/auth-text";
import { getSessionUser } from "@/lib/auth/session";
import { searchText } from "@/lib/search-text";
import { bookingText } from "@/lib/bookings-text";
import { UnreadMessagesLink } from "@/components/unread-messages-link";
import { dashboardText } from "@/lib/dashboard-text";
import { getLocale } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function Account() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const text = authText[l];

  type VStatus = "unverified" | "pending" | "verified" | "rejected";
  let verification = "unverified" as VStatus;
  let categories: { id: string; name: string }[] = [];
  if (!user.mock && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (user.role === "professional") {
      const [{ data: pro }, { data: cats }] = await Promise.all([
        supabase
          .from("professional_profiles")
          .select("verification_status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("categories").select("id, name_hi, name_en").order("sort_order"),
      ]);
      verification = (pro?.verification_status as VStatus) ?? "unverified";
      categories = (cats ?? []).map((c) => ({
        id: c.id,
        name: l === "hi" ? c.name_hi : c.name_en,
      }));
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-navy-900">{text.account}</h1>
      {user.mock && <Alert kind="info">{text.mockBanner}</Alert>}
      <Card className="space-y-2">
        <p className="text-sm text-muted">{text.welcomeBack}</p>
        <p className="font-semibold">{user.fullName ?? user.email}</p>
        <p className="text-sm text-muted">{user.email}</p>
        <div className="flex items-center gap-2">
          <Badge>{user.role}</Badge>
          {user.role === "professional" && (
            <Badge
              tone={
                verification === "verified"
                  ? "verified"
                  : verification === "pending"
                    ? "pending"
                    : "neutral"
              }
            >
              {text.verification}: {text[verification]}
            </Badge>
          )}
        </div>
      </Card>
      {(user.role === "professional" || user.role === "business") &&
        (user.mock ? (
          <Alert kind="info">{text.mockProfile}</Alert>
        ) : (
          <Card>
            <h2 className="mb-4 text-lg font-bold text-navy-900">{text.profile}</h2>
            <ProfileForm
              role={user.role}
              text={text}
              categories={categories}
              locText={searchText[l]}
              locTitle={searchText[l].myLocation}
              locHint={searchText[l].myLocationHint}
            />
          </Card>
        ))}
      <Link
        href="/search"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white"
      >
        {searchText[l].title}
      </Link>
      <Link
        href="/bookings"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-line bg-white font-semibold text-navy-900"
      >
        {user.role === "professional" ? bookingText[l].jobRequests : bookingText[l].myBookings}
      </Link>
      <Link
        href="/dashboard"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy-900 font-semibold text-white"
      >
        {dashboardText[l].title}
      </Link>
      <UnreadMessagesLink locale={l} mock={user.mock} />
      <form action={signOut}>
        <Button variant="outline" type="submit">
          {text.logout}
        </Button>
      </form>
    </div>
  );
}
