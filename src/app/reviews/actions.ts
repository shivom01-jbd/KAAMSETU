"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isLimited } from "@/lib/request-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { reportSchema, reviewSchema } from "@/lib/validation/social";

function mapError(e: { message?: string; code?: string }): string {
  const m = e.message ?? "";
  for (const k of [
    "unauthorized",
    "forbidden",
    "not_found",
    "not_completed",
    "duplicate_review",
    "duplicate_report",
    "too_many_reports",
    "invalid",
  ]) {
    if (m.includes(k)) return k;
  }
  return "failed";
}

export async function createReview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("review", 10)) return { error: "rate_limited" };
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_review", {
    p_booking: parsed.data.booking_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? null,
  });
  if (error) return { error: mapError(error) };
  revalidatePath("/bookings");
  return { message: "saved" };
}

export async function reportContent(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("report", 10)) return { error: "rate_limited" };
  const parsed = reportSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("report_content", {
    p_type: parsed.data.target_type,
    p_target: parsed.data.target_id,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: mapError(error) };
  return { message: "reportThanks" };
}
