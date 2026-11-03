"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { actorKind, canTransition, type BookingStatus } from "@/lib/bookings/transitions";
import { isLimited } from "@/lib/request-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { createBookingSchema, transitionSchema } from "@/lib/validation/booking";

function mapError(e: { message?: string; code?: string }): string {
  const m = e.message ?? "";
  for (const k of [
    "unauthorized",
    "forbidden",
    "not_found",
    "invalid_transition",
    "invalid_time",
    "too_many_requests",
  ]) {
    if (m.includes(k)) return k;
  }
  if (e.code === "23505") return "duplicate_open";
  if (e.code === "23514") return "invalid";
  return "failed";
}

export async function createBooking(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.role !== "customer" && user.role !== "business") return { error: "forbidden" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("booking", 10)) return { error: "rate_limited" };
  const parsed = createBookingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_booking", {
    p_professional: v.professional_id,
    p_description: v.description,
    p_preferred_at: v.preferred_at,
    p_area_label: v.area_label ?? null,
    p_lat: v.approx_lat ?? null,
    p_lng: v.approx_lng ?? null,
  });
  if (error) return { error: mapError(error) };
  revalidatePath("/bookings");
  redirect("/bookings");
}

/** Pre-checks make errors friendly; the database function is the real enforcement. */
export async function transitionBooking(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.mock || !isSupabaseConfigured()) return { error: "not_configured" };
  if (await isLimited("booking-transition", 30)) return { error: "rate_limited" };
  const parsed = transitionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("status, customer_id, professional_id")
    .eq("id", parsed.data.booking_id)
    .maybeSingle(); // RLS: non-participants get nothing
  if (!b) return { error: "not_found" };
  const kind = actorKind(user.id, b, user.role);
  if (!kind) return { error: "not_found" };
  if (!canTransition(b.status as BookingStatus, parsed.data.to, kind))
    return { error: "invalid_transition" };
  const { error } = await supabase.rpc("transition_booking", {
    p_booking: parsed.data.booking_id,
    p_to: parsed.data.to,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return { error: mapError(error) };
  revalidatePath("/bookings");
  return { message: "updated" };
}
