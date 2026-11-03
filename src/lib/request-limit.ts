import "server-only";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

/** True when this caller (by IP) has exceeded `limit` calls per minute for `name`. */
export async function isLimited(name: string, limit: number): Promise<boolean> {
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  return !rateLimit(`${name}:${ip}`, limit, 60_000).ok;
}
