import { haversineKm } from "@/lib/geo";
import type { SearchParams, SearchResult } from "./types";

export type Searchable = SearchResult & {
  serviceRadiusKm: number;
  categorySlug: string;
  listed: boolean;
};

/** Same rules as the SQL function search_professionals; used for dev sample data and as a test oracle. */
export function filterProfessionals(list: Searchable[], p: SearchParams): SearchResult[] {
  const hasLoc = p.lat != null && p.lng != null;
  return list
    .filter((x) => x.listed)
    .filter((x) => !p.cat || x.categorySlug === p.cat)
    .filter((x) => !p.avail || x.isAvailable)
    .filter((x) => p.pmin == null || x.priceMax == null || x.priceMax >= p.pmin)
    .filter((x) => p.pmax == null || x.priceMin == null || x.priceMin <= p.pmax)
    .filter((x) => p.rating == null || (x.ratingAvg != null && x.ratingAvg >= p.rating))
    .map((x) => ({
      ...x,
      distanceKm:
        hasLoc && x.lat != null && x.lng != null ? haversineKm(p.lat!, p.lng!, x.lat, x.lng) : null,
    }))
    .filter(
      (x) =>
        !hasLoc ||
        (x.distanceKm != null && x.distanceKm <= p.km && x.distanceKm <= x.serviceRadiusKm + 1.5),
    )
    .sort(
      (a, b) =>
        (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1),
    )
    .slice(0, 30);
}
