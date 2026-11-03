"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { isLimited } from "@/lib/request-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import {
  categorySchema,
  resolveReportSchema,
  suspendSchema,
  verificationSchema,
} from "@/lib/validation/admin";

type Guard = { ok: true } | { ok: false; state: FormState };

/** First line of defense (the database re-checks is_admin() in every function). */
async function guard(): Promise<Guard> {
  const user = await getSessionUser();
  if (!user) return { ok: false, state: { error: "unauthorized" } };
  if (user.mock || !isSupabaseConfigured())
    return { ok: false, state: { error: "not_configured" } };
  if (user.role !== "admin") return { ok: false, state: { error: "forbidden" } };
  if (await isLimited("admin", 60)) return { ok: false, state: { error: "rate_limited" } };
  return { ok: true };
}

function mapError(e: { message?: string }): string {
  const m = e.message ?? "";
  return (
    ["forbidden", "not_found", "invalid", "duplicate_slug", "unauthorized"].find((k) =>
      m.includes(k),
    ) ?? "failed"
  );
}

async function rpc(name: string, args: Record<string, unknown>, path: string): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(name, args as never);
  if (error) return { error: mapError(error) };
  revalidatePath(path);
  return { message: "updated" };
}

export async function setVerification(_: FormState, fd: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return g.state;
  const p = verificationSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  return rpc(
    "admin_set_verification",
    { p_user: p.data.user_id, p_status: p.data.status, p_note: null },
    "/admin/professionals",
  );
}

export async function setSuspended(_: FormState, fd: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return g.state;
  const p = suspendSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  return rpc(
    "admin_set_suspended",
    { p_user: p.data.user_id, p_suspended: p.data.suspended, p_note: p.data.note ?? null },
    "/admin/users",
  );
}

export async function resolveReport(_: FormState, fd: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return g.state;
  const p = resolveReportSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "invalid" };
  return rpc(
    "admin_resolve_report",
    {
      p_report: p.data.report_id,
      p_status: p.data.status,
      p_hide: p.data.hide,
      p_note: p.data.note ?? null,
    },
    "/admin/reports",
  );
}

export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return g.state;
  const p = categorySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const v = p.data;
  return rpc(
    "admin_save_category",
    {
      p_id: v.id ?? null,
      p_slug: v.slug,
      p_name_hi: v.name_hi,
      p_name_en: v.name_en,
      p_icon: v.icon ?? null,
      p_sort: v.sort_order,
      p_active: v.is_active,
    },
    "/admin/categories",
  );
}
