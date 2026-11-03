import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LocationPicker } from "@/components/location-picker";
import { haversineKm, roundCoord } from "@/lib/geo";
import { searchText } from "@/lib/search-text";
import { filterProfessionals } from "@/lib/search/filter";
import { sampleProfessionals } from "@/lib/search/sample";
import { parseSearchParams } from "@/lib/search/types";
import { professionalSchema } from "@/lib/validation/auth";

const lucknow = { lat: "26.85", lng: "80.95" };
const run = (raw: Record<string, string>) =>
  filterProfessionals(sampleProfessionals, parseSearchParams(raw));

describe("geo", () => {
  it("computes realistic distances and rounds to ~1 km", () => {
    expect(haversineKm(26.85, 80.95, 28.61, 77.21)).toBeGreaterThan(400);
    expect(haversineKm(26.85, 80.95, 28.61, 77.21)).toBeLessThan(520);
    expect(roundCoord(26.854321)).toBe(26.85);
  });
});

describe("search params", () => {
  it("drops tampered values instead of crashing", () => {
    const p = parseSearchParams({
      lat: "999",
      lng: "abc",
      km: "-5",
      view: "evil",
      cat: "DROP TABLE",
      rating: "9",
    });
    expect(p.lat).toBeUndefined();
    expect(p.lng).toBeUndefined();
    expect(p.km).toBe(25);
    expect(p.view).toBe("list");
    expect(p.cat).toBeUndefined();
    expect(p.rating).toBeUndefined();
  });
});

describe("search filtering (mirrors the SQL function)", () => {
  it("filters by category and sorts nearest first", () => {
    const r = run({ ...lucknow, cat: "electrician", km: "25" });
    expect(r.map((x) => x.id)).toEqual(["s1", "s3"]);
    expect(r[0].distanceKm!).toBeLessThanOrEqual(r[1].distanceKm!);
  });
  it("respects each professional's own service radius", () => {
    const r = run({ ...lucknow, km: "100", cat: "electrician" });
    expect(r.find((x) => x.id === "s3")?.distanceKm).toBeGreaterThan(5); // s3 radius is 5 km, so excluded
  });
  it("excludes far cities and unavailable people when asked", () => {
    expect(run({ ...lucknow, km: "25" }).some((x) => x.id === "s5")).toBe(false);
    expect(run({ ...lucknow, km: "25", avail: "1" }).some((x) => x.id === "s2")).toBe(false);
  });
  it("filters by price overlap and minimum rating", () => {
    expect(run({ pmin: "1000" }).map((x) => x.id)).toEqual(["s6"]);
    expect(run({ rating: "4.5" }).every((x) => (x.ratingAvg ?? 0) >= 4.5)).toBe(true);
  });
  it("without a location returns results with no distance", () => {
    expect(run({}).every((x) => x.distanceKm === null)).toBe(true);
  });
});

describe("coarse location privacy", () => {
  const ok = {
    category_id: "7d3f7c4e-1c1a-4a6e-9d5a-6c1f2f2f1a11",
    service_radius_km: "5",
    is_available: true,
    is_listed: true,
  };
  it("rounds whatever precise coordinates a client sends", () => {
    const r = professionalSchema.parse({ ...ok, approx_lat: "26.854321", approx_lng: "80.949876" });
    expect(r.approx_lat).toBe(26.85);
    expect(r.approx_lng).toBe(80.95);
  });
  it("requires both coordinates and rejects out-of-India points", () => {
    expect(professionalSchema.safeParse({ ...ok, approx_lat: "26.85" }).success).toBe(false);
    expect(
      professionalSchema.safeParse({ ...ok, approx_lat: "60", approx_lng: "80" }).success,
    ).toBe(false);
  });
});

describe("LocationPicker", () => {
  const text = searchText.en;
  it("does not ask for location until the button is pressed, then rounds", () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 26.854321, longitude: 80.949876 } } as GeolocationPosition),
    );
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });
    const { container } = render(<LocationPicker latName="lat" lngName="lng" text={text} />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: text.useMine }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect((container.querySelector('input[name="lat"]') as HTMLInputElement).value).toBe("26.85");
  });
  it("supports manual city entry", () => {
    const { container } = render(<LocationPicker latName="lat" lngName="lng" text={text} />);
    fireEvent.change(screen.getByLabelText(text.city), { target: { value: "Lucknow" } });
    expect((container.querySelector('input[name="lat"]') as HTMLInputElement).value).toBe("26.85");
  });
  it("shows a clear message when permission is denied", () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({} as GeolocationPositionError),
    );
    Object.defineProperty(globalThis.navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });
    render(<LocationPicker latName="lat" lngName="lng" text={text} />);
    fireEvent.click(screen.getByRole("button", { name: text.useMine }));
    expect(screen.getByRole("status")).toHaveTextContent(text.denied);
  });
});

describe("migration 0002 static checks", () => {
  const sql = readFileSync("supabase/migrations/0002_search_location.sql", "utf8");
  it("search runs as security invoker so RLS applies", () => {
    expect(sql).toMatch(/security invoker/);
    expect(sql).not.toMatch(/security definer/);
  });
  it("does not let users write rating columns and only stores coarse coordinates", () => {
    const cols = [
      ...sql.matchAll(/grant (?:insert|update) \(([^)]*)\) on public\.professional_profiles/g),
    ].map((m) => m[1]);
    expect(cols.length).toBe(2);
    for (const c of cols) expect(c).not.toMatch(/rating_/);
    expect(sql).toMatch(/approx_coarse/);
  });
  it("grants the is_suspended column the session lookup needs", () => {
    expect(sql).toMatch(/grant select \(is_suspended\) on public\.profiles to authenticated/);
  });
  it("is not callable by anonymous users", () => {
    expect(sql).toMatch(
      /revoke all on function public\.search_professionals[^;]+from public, anon/,
    );
  });
});
