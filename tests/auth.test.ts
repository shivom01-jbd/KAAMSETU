import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { authText } from "@/lib/auth-text";
import {
  businessSchema,
  professionalSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

afterEach(() => {
  resetRateLimits();
  vi.unstubAllEnvs();
});

describe("signup validation", () => {
  const base = { full_name: "Asha", email: "ASHA@Example.com ", password: "longenough1" };
  it("normalizes email and accepts allowed roles", () => {
    const r = signUpSchema.parse({ ...base, role: "professional" });
    expect(r.email).toBe("asha@example.com");
  });
  it("rejects admin and unknown roles from the client", () => {
    expect(signUpSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, role: "root" }).success).toBe(false);
  });
  it("rejects short passwords and bad emails", () => {
    expect(signUpSchema.safeParse({ ...base, role: "customer", password: "short" }).success).toBe(
      false,
    );
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("profile validation", () => {
  const ok = {
    category_id: "7d3f7c4e-1c1a-4a6e-9d5a-6c1f2f2f1a11",
    service_radius_km: "5",
    is_available: true,
    is_listed: false,
  };
  it("treats empty optional numbers as missing and coerces numbers", () => {
    const r = professionalSchema.parse({ ...ok, experience_years: "", price_min_inr: "200" });
    expect(r.experience_years).toBeUndefined();
    expect(r.price_min_inr).toBe(200);
  });
  it("ignores client-supplied verification or earnings fields", () => {
    const r = professionalSchema.parse({
      ...ok,
      verification_status: "verified",
      earnings: 99999,
    }) as Record<string, unknown>;
    expect(r.verification_status).toBeUndefined();
    expect(r.earnings).toBeUndefined();
  });
  it("rejects inverted price range, bad radius and empty company", () => {
    expect(
      professionalSchema.safeParse({ ...ok, price_min_inr: 500, price_max_inr: 100 }).success,
    ).toBe(false);
    expect(professionalSchema.safeParse({ ...ok, service_radius_km: 500 }).success).toBe(false);
    expect(businessSchema.safeParse({ company_name: "  " }).success).toBe(false);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 3, 1000, 10).ok).toBe(false);
    expect(rateLimit("k", 3, 1000, 1001).ok).toBe(true);
  });
  it("keeps keys independent", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("b", 1, 1000, 0).ok).toBe(true);
  });
});

describe("mock mode safety", () => {
  it("is never enabled in production", async () => {
    const { isAuthMockEnabled } = await import("@/lib/env/server");
    vi.stubEnv("AUTH_MOCK_MODE", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthMockEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(isAuthMockEnabled()).toBe(true);
  });
});

describe("auth text", () => {
  it("has the same keys in Hindi and English", () => {
    expect(Object.keys(authText.hi).sort()).toEqual(Object.keys(authText.en).sort());
  });
});
