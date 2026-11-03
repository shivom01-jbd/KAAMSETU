import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filterProfessionals } from "./filter";
import { sampleProfessionals } from "./sample";
import type { SearchParams, SearchResult } from "./types";

type RpcRow = {
  user_id: string;
  full_name: string | null;
  category_id: string | null;
  city: string | null;
  area_label: string | null;
  price_min_inr: number | null;
  price_max_inr: number | null;
  experience_years: number | null;
  is_available: boolean;
  rating_avg: number | string | null;
  rating_count: number;
  verification_status: string;
  approx_lat: number | null;
  approx_lng: number | null;
  distance_km: number | null;
};

export type SearchOutcome = {
  results: SearchResult[];
  error?: "not_configured" | "failed";
  sample?: boolean;
};

export async function searchProfessionals(
  p: SearchParams,
  opts: { mock: boolean },
): Promise<SearchOutcome> {
  if (opts.mock) return { results: filterProfessionals(sampleProfessionals, p), sample: true };
  if (!isSupabaseConfigured()) return { results: [], error: "not_configured" };
  const supabase = await createSupabaseServerClient();

  let categoryId: string | null = null;
  if (p.cat) {
    const { data } = await supabase.from("categories").select("id").eq("slug", p.cat).maybeSingle();
    if (!data) return { results: [] }; // unknown category: no results, no error
    categoryId = data.id;
  }
  const { data, error } = await supabase.rpc("search_professionals", {
    p_category: categoryId,
    p_lat: p.lat ?? null,
    p_lng: p.lng ?? null,
    p_max_km: p.km,
    p_available_only: p.avail,
    p_price_min: p.pmin ?? null,
    p_price_max: p.pmax ?? null,
    p_min_rating: p.rating ?? null,
    p_limit: 30,
  });
  if (error) return { results: [], error: "failed" };
  return {
    results: ((data ?? []) as RpcRow[]).map((r) => ({
      id: r.user_id,
      name: r.full_name ?? "—",
      categoryId: r.category_id,
      city: r.city,
      areaLabel: r.area_label,
      priceMin: r.price_min_inr,
      priceMax: r.price_max_inr,
      experienceYears: r.experience_years,
      isAvailable: r.is_available,
      ratingAvg: r.rating_avg == null ? null : Number(r.rating_avg),
      ratingCount: r.rating_count,
      verified: r.verification_status === "verified",
      lat: r.approx_lat,
      lng: r.approx_lng,
      distanceKm: r.distance_km,
    })),
  };
}
