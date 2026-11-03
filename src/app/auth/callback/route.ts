import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedNext = new Set(["/account", "/reset-password"]); // allow-list: no open redirects

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(`${origin}${allowedNext.has(next) ? next : "/account"}`);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
