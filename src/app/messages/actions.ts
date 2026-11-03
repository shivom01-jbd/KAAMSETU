"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isLimited } from "@/lib/request-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMessageSchema } from "@/lib/validation/social";

const CODES = [
  "unauthorized",
  "forbidden",
  "not_found",
  "chat_closed",
  "invalid_message",
  "too_fast",
];
function mapSocialError(e: { message?: string; code?: string }): string {
  const m = e.message ?? "";
  return CODES.find((k) => m.includes(k)) ?? "failed"; // raw database text is never shown
}

export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("message", 30)) return { error: "rate_limited" };
  const parsed = sendMessageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid_message" };
  const supabase = await createSupabaseServerClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", parsed.data.booking_id)
    .maybeSingle(); // RLS: strangers get nothing
  if (!conv) return { error: "not_found" };
  const { error } = await supabase.rpc("send_message", {
    p_conversation: conv.id,
    p_body: parsed.data.body,
  });
  if (error) return { error: mapSocialError(error) };
  revalidatePath(`/messages/${parsed.data.booking_id}`);
  return { message: "sent" };
}
