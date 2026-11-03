import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { bookingText } from "@/lib/bookings-text";
import { getLocale } from "@/lib/i18n/server";
import { socialText } from "@/lib/social-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

type Row = {
  conversation_id: string;
  booking_id: string;
  other_name: string | null;
  last_body: string | null;
  unread_count: number;
  last_message_at: string | null;
};

export default async function Inbox() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = socialText[l];
  const head = <h1 className="text-2xl font-extrabold text-navy-900">{t.messages}</h1>;
  if (user.mock || !isSupabaseConfigured())
    return (
      <div className="space-y-4">
        {head}
        <Alert kind="info">{bookingText[l].needsSupabase}</Alert>
      </div>
    );
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("my_conversations");
  const rows = (data ?? []) as Row[];
  return (
    <div className="space-y-4">
      {head}
      {rows.length === 0 ? (
        <EmptyState title={t.noChats} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.conversation_id}>
              <Link
                href={`/messages/${r.booking_id}`}
                className="block rounded-(--radius-card) border border-line bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-navy-900">{r.other_name ?? "—"}</span>
                  {Number(r.unread_count) > 0 && (
                    <Badge tone="pending">
                      {r.unread_count} {t.unread}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted">
                  {r.last_body ?? t.noMessages}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
