import { z } from "zod";

const empty = (v: unknown) => (v === "" || v == null ? undefined : v);
const num = (min: number, max: number) =>
  z.preprocess(empty, z.coerce.number().min(min).max(max)).optional().catch(undefined);

/** Bad or tampered URL values are dropped instead of crashing the page. */
export const searchSchema = z.object({
  cat: z
    .string()
    .regex(/^[a-z0-9-]{2,40}$/)
    .optional()
    .catch(undefined),
  lat: num(6, 38),
  lng: num(68, 98),
  km: z.preprocess(empty, z.coerce.number().int().min(1).max(200)).catch(25).default(25),
  avail: z.preprocess((v) => v === "1" || v === "on", z.boolean()).catch(false),
  pmin: num(0, 1_000_000),
  pmax: num(0, 1_000_000),
  rating: num(0, 5),
  view: z.enum(["list", "map"]).catch("list").default("list"),
});
export type SearchParams = z.infer<typeof searchSchema>;

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return searchSchema.parse(flat);
}

export type SearchResult = {
  id: string;
  name: string;
  categoryId: string | null;
  city: string | null;
  areaLabel: string | null;
  priceMin: number | null;
  priceMax: number | null;
  experienceYears: number | null;
  isAvailable: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  verified: boolean;
  lat: number | null; // coarse (0.01 degree) only
  lng: number | null;
  distanceKm: number | null;
};
