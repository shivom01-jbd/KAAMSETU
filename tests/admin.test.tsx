import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardText } from "@/lib/dashboard-text";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  availabilitySchema,
  categorySchema,
  resolveReportSchema,
  suspendSchema,
  verificationSchema,
} from "@/lib/validation/admin";

const rpc = vi.fn();
const eq = vi.fn(async () => ({ error: null }));
const update = vi.fn(() => ({ eq }));
let sessionUser: unknown = null;
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () => sessionUser,
  MOCK_COOKIE: "m",
}));
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  supabaseUrl: "x",
  supabaseAnonKey: "y",
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ rpc, from: () => ({ update }) }),
}));

const U = "7d3f7c4e-1c1a-4a6e-9d5a-6c1f2f2f1a11";
const R = "0b9d3b6e-2f6c-4f1c-8a52-1f5d9a0c7e22";
const form = (o: Record<string, string>) =>
  Object.entries(o).reduce((f, [k, v]) => (f.append(k, v), f), new FormData());
const as = (role: string, mock = false) => {
  sessionUser = { id: "me", role, mock };
};

beforeEach(() => {
  resetRateLimits();
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
  update.mockClear();
  eq.mockClear();
  sessionUser = null;
});

describe("admin area guard", () => {
  it("anonymous goes to login; customers, professionals, businesses and mock sessions get a 404", async () => {
    const { requireAdmin } = await import("@/lib/auth/admin");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
    for (const role of ["customer", "professional", "business"]) {
      as(role);
      await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    }
    as("admin", true);
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
  it("lets a real admin through", async () => {
    const { requireAdmin } = await import("@/lib/auth/admin");
    as("admin");
    await expect(requireAdmin()).resolves.toMatchObject({ role: "admin" });
  });
});

describe("admin actions", () => {
  it("every action refuses non-admins without calling the database", async () => {
    const a = await import("@/app/admin/actions");
    const calls: [(p: object, f: FormData) => Promise<object>, Record<string, string>][] = [
      [a.setVerification, { user_id: U, status: "verified" }],
      [a.setSuspended, { user_id: U, suspended: "true" }],
      [a.resolveReport, { report_id: R, status: "reviewed", hide: "true" }],
      [a.saveCategory, { slug: "welder", name_en: "Welder", name_hi: "वेल्डर", is_active: "true" }],
    ];
    for (const role of ["customer", "professional", "business"]) {
      as(role);
      for (const [fn, data] of calls)
        expect(await fn({}, form(data))).toEqual({ error: "forbidden" });
    }
    sessionUser = null;
    for (const [fn, data] of calls)
      expect(await fn({}, form(data))).toEqual({ error: "unauthorized" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("an admin's verification call carries only ids and an allowed status", async () => {
    const { setVerification } = await import("@/app/admin/actions");
    as("admin");
    expect(await setVerification({}, form({ user_id: U, status: "verified" }))).toEqual({
      message: "updated",
    });
    expect(rpc).toHaveBeenCalledWith("admin_set_verification", {
      p_user: U,
      p_status: "verified",
      p_note: null,
    });
    expect(await setVerification({}, form({ user_id: U, status: "pending" }))).toEqual({
      error: "invalid",
    });
    expect(await setVerification({}, form({ user_id: "nope", status: "verified" }))).toEqual({
      error: "invalid",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("maps database errors to safe codes and never leaks raw text", async () => {
    const { setSuspended } = await import("@/app/admin/actions");
    as("admin");
    rpc.mockResolvedValue({ error: { message: "forbidden" } });
    expect(await setSuspended({}, form({ user_id: U, suspended: "true" }))).toEqual({
      error: "forbidden",
    });
    rpc.mockResolvedValue({ error: { message: "relation auth.users secret internals" } });
    expect(await setSuspended({}, form({ user_id: U, suspended: "true" }))).toEqual({
      error: "failed",
    });
  });
  it("report resolution accepts only reviewed or dismissed, never open", async () => {
    const { resolveReport } = await import("@/app/admin/actions");
    as("admin");
    expect(await resolveReport({}, form({ report_id: R, status: "open", hide: "false" }))).toEqual({
      error: "invalid",
    });
    expect(
      await resolveReport({}, form({ report_id: R, status: "dismissed", hide: "false" })),
    ).toEqual({ message: "updated" });
  });
  it("category input is validated (slug rules) before reaching the database", async () => {
    const { saveCategory } = await import("@/app/admin/actions");
    as("admin");
    const bad = await saveCategory(
      {},
      form({ slug: "Bad Slug!", name_en: "x", name_hi: "y", is_active: "true" }),
    );
    expect(bad.fieldErrors?.slug).toBe("invalid");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rate limits admin bursts", async () => {
    const { setSuspended } = await import("@/app/admin/actions");
    as("admin");
    let last: unknown;
    for (let i = 0; i < 61; i++)
      last = await setSuspended({}, form({ user_id: U, suspended: "true" }));
    expect(last).toEqual({ error: "rate_limited" });
  });
});

describe("professional availability", () => {
  it("only professionals can change it, and only their own row", async () => {
    const { setAvailability } = await import("@/app/dashboard/actions");
    sessionUser = null;
    expect(await setAvailability({}, form({ available: "false" }))).toEqual({
      error: "unauthorized",
    });
    as("customer");
    expect(await setAvailability({}, form({ available: "false" }))).toEqual({ error: "forbidden" });
    expect(update).not.toHaveBeenCalled();
    as("professional");
    expect(
      await setAvailability({}, form({ available: "false", user_id: "someone-else" })),
    ).toEqual({ message: "updated" });
    expect(update).toHaveBeenCalledWith({ is_available: false });
    expect(eq).toHaveBeenCalledWith("user_id", "me"); // the session id, never the form value
  });
});

describe("admin validation", () => {
  it("parses booleans from form text", () => {
    expect(suspendSchema.parse({ user_id: U, suspended: "true" }).suspended).toBe(true);
    expect(suspendSchema.parse({ user_id: U, suspended: "false" }).suspended).toBe(false);
    expect(availabilitySchema.parse({ available: "true" }).available).toBe(true);
  });
  it("rejects bad ids, statuses and roles smuggled into forms", () => {
    expect(verificationSchema.safeParse({ user_id: "x", status: "verified" }).success).toBe(false);
    expect(
      resolveReportSchema.safeParse({ report_id: R, status: "deleted", hide: "false" }).success,
    ).toBe(false);
    const c = categorySchema.parse({
      slug: "welder",
      name_en: "Welder",
      name_hi: "वेल्डर",
      is_active: "true",
      role: "admin",
    }) as Record<string, unknown>;
    expect(c.role).toBeUndefined();
    expect(c.sort_order).toBe(0);
  });
});

describe("components and text", () => {
  it("ConfirmSubmit asks before submitting and carries only the given hidden fields", async () => {
    const { ConfirmSubmit } = await import("@/components/confirm-submit");
    const { container } = render(
      <ConfirmSubmit
        action={async () => ({})}
        fields={{ user_id: U, suspended: "true" }}
        label="Suspend"
        danger
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelectorAll("input[type=hidden]").length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("dashboard text matches in both languages and does not invent earnings", () => {
    expect(Object.keys(dashboardText.hi).sort()).toEqual(Object.keys(dashboardText.en).sort());
    expect(dashboardText.en.earningsNote).toMatch(/not shown yet/);
  });
});

describe("migration 0005 static checks", () => {
  const sql = readFileSync("supabase/migrations/0005_admin_dashboard.sql", "utf8");
  const admin = [
    "admin_stats",
    "admin_list_users",
    "admin_set_suspended",
    "admin_list_professionals",
    "admin_save_category",
    "admin_list_reports",
    "admin_resolve_report",
  ];
  const block = (fn: string) =>
    sql.split("create function public.").find((b) => b.startsWith(fn + "("))!;
  it("every admin function checks is_admin() inside the database", () => {
    for (const fn of admin)
      expect(block(fn)).toMatch(/not public\.is_admin\(\) then raise exception 'forbidden'/);
  });
  it("every function fixes search_path", () => {
    for (const b of sql.split("create function").slice(1))
      expect(b).toMatch(/set search_path = ''/);
  });
  it("every function is revoked from anon and granted to signed-in users only", () => {
    for (const fn of [...admin, "my_dashboard_stats"]) expect(sql).toContain(`'${fn}(`);
    expect(sql).toMatch(/revoke all on function public\.%s from public, anon/);
    expect(sql).toMatch(/grant execute on function public\.%s to authenticated/);
  });
  it("every state-changing admin function writes the audit log", () => {
    for (const fn of ["admin_set_suspended", "admin_save_category", "admin_resolve_report"])
      expect(block(fn)).toMatch(/insert into public\.admin_audit_logs/);
  });
  it("protects admins from lockout and from each other", () => {
    expect(sql).toMatch(/p_user = auth\.uid\(\) then raise exception 'invalid'/);
    expect(sql).toMatch(/target\.role = 'admin' then raise exception 'forbidden'/);
  });
  it("dashboard stats run as the caller and always filter by auth.uid()", () => {
    const b = block("my_dashboard_stats");
    expect(b).toMatch(/security invoker/);
    expect(b).not.toMatch(/security definer/);
    expect((b.match(/auth\.uid\(\)/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
  it("adds no new direct table grants", () => {
    expect(sql).not.toMatch(/grant (select|insert|update|delete)[^;]*on public\./);
  });
});

describe("every admin page checks admin access itself", () => {
  it("calls requireAdmin() before touching data", async () => {
    const { globSync } = await import("node:fs");
    const files = globSync("src/app/admin/**/page.tsx");
    expect(files.length).toBe(6);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const guard = src.indexOf("await requireAdmin()");
      expect(guard, f).toBeGreaterThan(-1);
      expect(guard, f).toBeLessThan(src.indexOf("createSupabaseServerClient()"));
    }
  });
});
