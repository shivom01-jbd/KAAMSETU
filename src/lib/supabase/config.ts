const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True only when real-looking values are set (placeholders from .env.example do not count). */
export function isSupabaseConfigured(): boolean {
  return /^https?:\/\//.test(url) && anon.length > 20 && !anon.startsWith("your-");
}
export const supabaseUrl = url;
export const supabaseAnonKey = anon;
