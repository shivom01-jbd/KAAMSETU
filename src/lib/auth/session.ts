import "server-only";
import { cookies } from "next/headers";
import { isAuthMockEnabled } from "@/lib/env/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MOCK_COOKIE = "ks_mock_session";
export type Role = "customer" | "professional" | "business" | "admin";
export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  mock: boolean;
};

/** Role always comes from the DB (profiles), never from client metadata. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isAuthMockEnabled()) {
    const raw = (await cookies()).get(MOCK_COOKIE)?.value;
    if (!raw) return null;
    try {
      const m = JSON.parse(raw) as { email?: string; role?: string; name?: string };
      const role = m.role === "professional" || m.role === "business" ? m.role : "customer";
      return {
        id: "mock-user",
        email: String(m.email ?? "mock@example.com"),
        role,
        fullName: m.name ?? null,
        mock: true,
      };
    } catch {
      return null;
    }
  }
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser(); // validates the JWT with Supabase
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, is_suspended")
    .eq("id", data.user.id)
    .single();
  if (!profile || profile.is_suspended) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: profile.role as Role,
    fullName: profile.full_name,
    mock: false,
  };
}
