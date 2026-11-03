import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Static guards on the SQL. These do NOT replace running the policies against a real database.
const sql = readFileSync("supabase/migrations/0001_core_schema.sql", "utf8");
const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);

describe("migration 0001 static checks", () => {
  it("enables RLS on every public table", () => {
    expect(tables.length).toBeGreaterThan(5);
    for (const t of tables)
      expect(sql).toContain(`alter table public.${t} enable row level security`);
  });
  it("whitelists signup roles so admin cannot be self-assigned", () => {
    expect(sql).toMatch(/r in \('customer', 'professional', 'business'\)/);
  });
  it("does not grant users write access to verification columns", () => {
    const grants = sql
      .split("grant")
      .filter(
        (g) =>
          g.includes("on public.professional_profiles to authenticated") && /insert|update/.test(g),
      );
    for (const g of grants) expect(g).not.toMatch(/verification_status|verified_at|verified_by/);
  });
  it("sets search_path on every security definer function", () => {
    const defs = sql
      .split("create function")
      .slice(1)
      .filter((f) => f.includes("security definer"));
    for (const d of defs) expect(d).toMatch(/set search_path = ''/);
  });
  it("keeps verification documents private with size limits", () => {
    expect(sql).toMatch(/'verification-docs', 'verification-docs', false, 5242880/);
  });
});
