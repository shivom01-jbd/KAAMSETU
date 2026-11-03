"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthMockEnabled } from "@/lib/env/server";
import { getSessionUser, MOCK_COOKIE } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  businessSchema,
  fieldErrors,
  forgotSchema,
  professionalSchema,
  resetSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; message?: string };

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function limited(name: string, limit: number) {
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  return !rateLimit(`${name}:${ip}`, limit, 60_000).ok;
}
const notConfigured: FormState = { error: "not_configured" };

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  if (await limited("signup", 5)) return { error: "rate_limited" };
  const parsed = signUpSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, full_name, role } = parsed.data;
  if (isAuthMockEnabled()) {
    (await cookies()).set(MOCK_COOKIE, JSON.stringify({ email, role, name: full_name }), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    redirect("/account");
  }
  if (!isSupabaseConfigured()) return notConfigured;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role },
      emailRedirectTo: `${appUrl()}/auth/callback?next=/account`,
    },
  });
  if (error) return { error: "failed" };
  return { message: "check_email" }; // same message whether or not the email already exists
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  if (await limited("signin", 8)) return { error: "rate_limited" };
  const parsed = signInSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (isAuthMockEnabled()) {
    (await cookies()).set(
      MOCK_COOKIE,
      JSON.stringify({ email: parsed.data.email, role: "customer" }),
      { httpOnly: true, path: "/", sameSite: "lax" },
    );
    redirect("/account");
  }
  if (!isSupabaseConfigured()) return notConfigured;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "invalid_login" };
  redirect("/account");
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  if (await limited("reset", 3)) return { error: "rate_limited" };
  const parsed = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return notConfigured;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
  });
  return { message: "reset_sent" }; // never reveals whether the account exists
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return notConfigured;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "unauthorized" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "failed" };
  redirect("/account");
}

export async function signOut() {
  (await cookies()).delete(MOCK_COOKIE);
  if (isSupabaseConfigured()) await (await createSupabaseServerClient()).auth.signOut();
  redirect("/");
}

/** Role is read from the server session; the form cannot choose which table is written. */
export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { error: "unauthorized" };
  if (user.mock || !isSupabaseConfigured()) return notConfigured;
  const supabase = await createSupabaseServerClient();
  const raw = Object.fromEntries(fd);
  if (user.role === "professional") {
    const parsed = professionalSchema.safeParse({
      ...raw,
      is_available: fd.get("is_available") === "on",
      is_listed: fd.get("is_listed") === "on",
    });
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
    const { error } = await supabase
      .from("professional_profiles")
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
    return error ? { error: "failed" } : { message: "saved" };
  }
  if (user.role === "business") {
    const parsed = businessSchema.safeParse(raw);
    if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
    const { error } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
    return error ? { error: "failed" } : { message: "saved" };
  }
  return { error: "unauthorized" };
}
