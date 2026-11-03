import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

/** Browser client: used ONLY for Realtime notifications. All reads/writes still go through server code and RLS. */
export const createSupabaseBrowserClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);
