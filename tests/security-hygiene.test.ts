import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const srcFiles = globSync("src/**/*.{ts,tsx}");

describe("secrets and client/server separation", () => {
  it("the service-role key is never referenced in application code", () => {
    for (const f of srcFiles) expect(read(f), f).not.toMatch(/SERVICE_ROLE/i);
  });
  it("browser components only read NEXT_PUBLIC_ environment variables", () => {
    const clientFiles = srcFiles.filter((f) => /^\s*["']use client["']/m.test(read(f)));
    expect(clientFiles.length).toBeGreaterThan(5);
    for (const f of clientFiles) expect(read(f), f).not.toMatch(/process\.env\.(?!NEXT_PUBLIC_)/);
  });
  it("browser components never import server-only modules", () => {
    const clientFiles = srcFiles.filter((f) => /^\s*["']use client["']/m.test(read(f)));
    for (const f of clientFiles) {
      expect(read(f), f).not.toMatch(
        /server-only|@\/lib\/env\/server|@\/lib\/supabase\/server|@\/lib\/auth\/(session|admin)/,
      );
    }
  });
  it(".gitignore keeps .env files out but allows the example", () => {
    const g = read(".gitignore");
    expect(g).toMatch(/^\.env$/m);
    expect(g).toMatch(/^\.env\.\*$/m);
    expect(g).toMatch(/^!\.env\.example$/m);
  });
  it(".env.example contains placeholders only", () => {
    const e = read(".env.example");
    expect(e).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(e).not.toMatch(/sk_(live|test)_|service_role\s*=\s*ey/i);
    expect(e).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY=your-/);
    expect(e).toMatch(/SUPABASE_SERVICE_ROLE_KEY=your-/);
  });
});

describe("XSS and injection hygiene", () => {
  it("never injects raw HTML or evaluates strings", () => {
    for (const f of srcFiles) {
      expect(read(f), f).not.toMatch(
        /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/,
      );
    }
  });
  it("never builds SQL strings in application code", () => {
    for (const f of srcFiles)
      expect(read(f), f).not.toMatch(/\b(select|insert into|update|delete from)\b[^\n]*\$\{/i);
  });
});

describe("server actions", () => {
  const actionFiles = globSync("src/app/**/actions.ts");
  it("only export async functions or types (Next.js requirement that once broke our build)", () => {
    expect(actionFiles.length).toBe(7); // includes the public language switch
    for (const f of actionFiles) {
      const bad = read(f)
        .split("\n")
        .filter((l) => /^export /.test(l) && !/^export (async function|type|interface)\b/.test(l));
      expect(bad, f).toEqual([]);
    }
  });
  it("protected action files always identify the caller from the server session", () => {
    // src/app/actions.ts is the public language switch; auth/ handles login itself
    for (const f of actionFiles.filter((x) => !x.includes("/auth/") && x !== "src/app/actions.ts"))
      expect(read(f), f).toMatch(/getSessionUser\(\)/);
  });
});

describe("protected pages check the session", () => {
  const pages = [
    "account",
    "bookings",
    "bookings/new",
    "messages",
    "messages/[bookingId]",
    "professionals/[id]",
    "search",
    "dashboard",
  ].map((p) => `src/app/${p}/page.tsx`);
  it("require a signed-in user", () => {
    for (const f of pages) expect(read(f), f).toMatch(/getSessionUser\(\)/);
    for (const f of pages) expect(read(f), f).toMatch(/redirect\("\/login"\)/);
  });
  it("admin pages require an admin (checked again in every page, not only the layout)", () => {
    const admin = globSync("src/app/admin/**/page.tsx");
    expect(admin.length).toBe(6);
    for (const f of admin) expect(read(f), f).toMatch(/await requireAdmin\(\)/);
    expect(read("src/app/admin/layout.tsx")).toMatch(/requireAdmin\(\)/);
  });
});

describe("HTTP security headers", () => {
  it("sends the expected headers on every route", async () => {
    const cfg = (await import("../next.config")).default;
    const rules = await cfg.headers!();
    const h = Object.fromEntries(rules[0].headers.map((x) => [x.key, x.value]));
    expect(rules[0].source).toBe("/(.*)");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{7,}/);
    expect(h["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(cfg.poweredByHeader).toBe(false);
  });
});

describe("migrations", () => {
  const files = globSync("supabase/migrations/*.sql").sort();
  it("are numbered in order without gaps", () => {
    expect(files.map((f) => f.split("/").pop()!.slice(0, 4))).toEqual([
      "0001",
      "0002",
      "0003",
      "0004",
      "0005",
    ]);
  });
  it("no table is ever created without RLS being enabled", () => {
    const all = files.map(read).join("\n");
    const tables = [...all.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBe(15);
    for (const t of tables)
      expect(all, t).toContain(`alter table public.${t} enable row level security`);
  });
  it("no policy grants anything to the anon role on private tables", () => {
    const all = files.map(read).join("\n");
    const anonGrants = [...all.matchAll(/grant [^;]* to anon[^;]*;/g)].map((m) => m[0]);
    for (const g of anonGrants) expect(g).toMatch(/public\.categories|public\.skills/);
  });
  it("ships a SQL security test that covers strangers, customers, professionals and admins", () => {
    const s = read("supabase/tests/security_check.sql");
    for (const k of [
      "A. A STRANGER",
      "B. The CUSTOMER",
      "C. The PROFESSIONAL",
      "D. An ADMIN",
      "reset role",
      "SECURITY REPORT",
    ])
      expect(s).toContain(k);
  });
});
