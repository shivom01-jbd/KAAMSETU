import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ChatForm } from "@/components/chat-form";
import { ChatLive } from "@/components/chat-live";
import { ReportButton } from "@/components/report-button";
import { Alert } from "@/components/ui/feedback";
import { getSessionUser } from "@/lib/auth/session";
import { bookingText } from "@/lib/bookings-text";
import { actorKind } from "@/lib/bookings/transitions";
import { getLocale } from "@/lib/i18n/server";
import { socialText } from "@/lib/social-text";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chat" };

export default async function Chat({ params }: { params: Promise<{ bookingId: string }> }) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).bookingId);
  if (!id.success) notFound();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = socialText[l];
  if (user.mock || !isSupabaseConfigured())
    return <Alert kind="info">{bookingText[l].needsSupabase}</Alert>;

  const supabase = await createSupabaseServerClient();
  const [{ data: conv }, { data: booking }] = await Promise.all([
    supabase.from("conversations").select("id").eq("booking_id", id.data).maybeSingle(),
    supabase
      .from("bookings")
      .select("status, customer_id, professional_id")
      .eq("id", id.data)
      .maybeSingle(),
  ]);
  if (!conv || !booking) notFound(); // RLS hides other people's chats: same answer as "does not exist"
  const kind = actorKind(user.id, booking);
  const otherId = kind === "professional" ? booking.customer_id : booking.professional_id;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conv.id)
      .order("id", { ascending: false })
      .limit(200),
  ]);
  await supabase.rpc("mark_conversation_read", { p_conversation: conv.id });
  const messages = [...(msgs ?? [])].reverse();
  const fmt = new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="space-y-4">
      <Link href="/messages" className="text-sm font-semibold text-brand-600">
        ← {t.back}
      </Link>
      <h1 className="text-xl font-extrabold text-navy-900">
        {t.chatWith} {other?.full_name ?? "—"}
      </h1>
      <ChatLive conversationId={conv.id} />
      <ul className="space-y-2" aria-live="polite">
        {messages.length === 0 && <li className="text-sm text-muted">{t.noMessages}</li>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <li key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "bg-brand-600 text-white" : "border border-line bg-white"}`}
              >
                {/* React escapes text: message bodies can never inject HTML */}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-xs ${mine ? "text-white/80" : "text-muted"}`}>
                  {fmt.format(new Date(m.created_at))}
                </p>
                {!mine && <ReportButton targetType="message" targetId={String(m.id)} text={t} />}
              </div>
            </li>
          );
        })}
      </ul>
      <ChatForm bookingId={id.data} text={t} closed={booking.status === "cancelled"} />
    </div>
  );
}
