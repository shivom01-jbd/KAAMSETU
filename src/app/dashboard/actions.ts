"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isLimited } from "@/lib/request-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { availabilitySchema } from "@/lib/validation/admin";

/** Only a professional can change their own availability; the row is always the caller's own (never from the form). */
export async function setAvailability(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.role !== "professional") return { error: "forbidden" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("availability", 20)) return { error: "rate_limited" };
  const p = availabilitySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("professional_profiles")
    .update({ is_available: p.data.available })
    .eq("user_id", user.id);
  if (error) return { error: "failed" };
  revalidatePath("/dashboard");
  return { message: "updated" };
}
