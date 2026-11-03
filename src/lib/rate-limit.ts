const buckets = new Map<string, { count: number; reset: number }>();

/**
 * In-memory fixed-window limiter. Good for one server instance and for tests.
 * For multi-instance production (Vercel), swap the store for Upstash/Redis behind this same function.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || now >= b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

export function resetRateLimits() {
  buckets.clear();
}
