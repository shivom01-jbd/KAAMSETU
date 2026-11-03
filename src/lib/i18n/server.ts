import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./messages";

export const LOCALE_COOKIE = "ks_locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}
