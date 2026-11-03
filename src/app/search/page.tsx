import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocationPicker } from "@/components/location-picker";
import { ResultsMap } from "@/components/map/results-map";
import { ProfessionalCard } from "@/components/professional-card";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { getSessionUser } from "@/lib/auth/session";
import { categories as staticCategories } from "@/lib/content";
import { bookingText } from "@/lib/bookings-text";
import { getLocale } from "@/lib/i18n/server";
import { searchText } from "@/lib/search-text";
import { searchProfessionals } from "@/lib/search/professionals";
import { parseSearchParams } from "@/lib/search/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Find professionals" };
type Cat = { id: string; slug: string; name: string };

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const l = await getLocale();
  const t = searchText[l];
  const bt = bookingText[l];
  const canBook = user.role === "customer" || user.role === "business";
  const params = parseSearchParams(await searchParams);

  let cats: Cat[] = staticCategories.map((c) => ({ id: c.slug, slug: c.slug, name: c.name[l] }));
  if (!user.mock && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("categories")
      .select("id, slug, name_hi, name_en")
      .order("sort_order");
    cats = (data ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: l === "hi" ? c.name_hi : c.name_en,
    }));
  }
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const { results, error, sample } = await searchProfessionals(params, { mock: user.mock });

  const qs = (view: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, view }))
      if (v != null && v !== false) q.set(k, v === true ? "1" : String(v));
    return `/search?${q}`;
  };
  const points = results
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({ id: r.id, lat: r.lat!, lng: r.lng!, label: r.name, available: r.isAvailable }));
  const center =
    params.lat != null && params.lng != null ? { lat: params.lat, lng: params.lng } : undefined;
  const sel = "min-h-12 w-full rounded-xl border border-line bg-white px-3";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-navy-900">{t.title}</h1>
      {sample && <Alert kind="info">{t.sample}</Alert>}
      <form
        method="get"
        className="space-y-4 rounded-(--radius-card) border border-line bg-white p-4"
      >
        <input type="hidden" name="view" value={params.view} />
        <div className="space-y-1.5">
          <label htmlFor="cat" className="text-sm font-medium text-navy-900">
            {t.category}
          </label>
          <select id="cat" name="cat" defaultValue={params.cat ?? ""} className={sel}>
            <option value="">{t.anyCategory}</option>
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <LocationPicker
          latName="lat"
          lngName="lng"
          initialLat={params.lat}
          initialLng={params.lng}
          text={t}
        />
        <div className="space-y-1.5">
          <label htmlFor="km" className="text-sm font-medium text-navy-900">
            {t.distance}
          </label>
          <select id="km" name="km" defaultValue={String(params.km)} className={sel}>
            {[5, 10, 25, 50, 100].map((k) => (
              <option key={k} value={k}>
                {k} km
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t.priceMin} name="pmin" type="number" min={0} defaultValue={params.pmin} />
          <Input label={t.priceMax} name="pmax" type="number" min={0} defaultValue={params.pmax} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rating" className="text-sm font-medium text-navy-900">
            {t.rating}
          </label>
          <select
            id="rating"
            name="rating"
            defaultValue={params.rating != null ? String(params.rating) : ""}
            className={sel}
          >
            <option value="">{t.anyRating}</option>
            {[3, 4, 4.5].map((r) => (
              <option key={r} value={r}>
                ★ {r}+
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="avail" value="1" defaultChecked={params.avail} />{" "}
          {t.available}
        </label>
        <Button type="submit">{t.search}</Button>
      </form>

      {center == null && <p className="text-sm text-muted">{t.needLocation}</p>}
      {error && (
        <Alert kind="error">{error === "not_configured" ? t.notConfigured : t.failed}</Alert>
      )}

      {!error && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-navy-900">
              {results.length} {t.results}
            </p>
            <nav
              aria-label="View"
              className="inline-flex rounded-full border border-line bg-white p-0.5 text-sm font-semibold"
            >
              {(["list", "map"] as const).map((v) => (
                <Link
                  key={v}
                  href={qs(v)}
                  aria-current={params.view === v ? "page" : undefined}
                  className={`min-h-9 rounded-full px-4 py-1.5 ${params.view === v ? "bg-navy-900 text-white" : "text-navy-900"}`}
                >
                  {t[v]}
                </Link>
              ))}
            </nav>
          </div>
          {results.length === 0 ? (
            <EmptyState title={t.none} body={t.noneHint} />
          ) : params.view === "map" ? (
            <ResultsMap points={points} center={center} unavailableText={t.mapOff} />
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.id}>
                  <ProfessionalCard
                    r={r}
                    categoryName={r.categoryId ? catName.get(r.categoryId) : undefined}
                    text={t}
                    bookHref={canBook ? `/bookings/new?pro=${r.id}` : undefined}
                    bookLabel={bt.request}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">{t.approxNote}</p>
        </>
      )}
    </div>
  );
}
