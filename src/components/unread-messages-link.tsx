import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import type { Locale } from "@/lib/i18n/messages";
import { socialText } from "@/lib/social-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function UnreadMessagesLink({ locale, mock }: { locale: Locale; mock: boolean }) {
  const t = socialText[locale];
  let unread = 0;
  if (!mock && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("my_conversations");
    unread = ((data ?? []) as { unread_count: number }[]).reduce(
      (s, c) => s + Number(c.unread_count),
      0,
    );
  }
  return (
    <Link
      href="/messages"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white font-semibold text-navy-900"
    >
      {t.messages}{" "}
      {unread > 0 && (
        <Badge tone="pending">
          {unread} {t.unread}
        </Badge>
      )}
    </Link>
  );
}
