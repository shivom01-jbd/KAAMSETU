import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/feedback";
import type { SearchText } from "@/lib/search-text";
import type { SearchResult } from "@/lib/search/types";

export function ProfessionalCard({
  r,
  categoryName,
  text,
  bookHref,
  bookLabel,
}: {
  r: SearchResult;
  categoryName?: string;
  text: SearchText;
  bookHref?: string;
  bookLabel?: string;
}) {
  const price =
    r.priceMin != null || r.priceMax != null ? `₹${r.priceMin ?? "…"}–${r.priceMax ?? "…"}` : null;
  return (
    <Card className="flex gap-3">
      <div
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-bold text-navy-900"
      >
        {r.name.trim().charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-navy-900">
            <Link href={`/professionals/${r.id}`} className="underline-offset-2 hover:underline">
              {r.name}
            </Link>
          </h3>
          {r.verified && <Badge tone="verified">{text.verified}</Badge>}
          <Badge tone={r.isAvailable ? "verified" : "pending"}>
            {r.isAvailable ? text.availableBadge : text.busy}
          </Badge>
        </div>
        <p className="text-sm text-muted">
          {[categoryName, r.areaLabel, r.city].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm">
          {r.ratingAvg != null && r.ratingCount > 0
            ? `★ ${r.ratingAvg.toFixed(1)} (${r.ratingCount})`
            : text.noReviews}
          {price && ` · ${price}`}
          {r.experienceYears != null && ` · ${r.experienceYears} ${text.years}`}
        </p>
        {r.distanceKm != null && (
          <p className="text-sm font-semibold text-brand-600">
            ≈ {r.distanceKm.toFixed(1)} km {text.away}
          </p>
        )}
        {bookHref && (
          <Link
            href={bookHref}
            className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white"
          >
            {bookLabel}
          </Link>
        )}
      </div>
    </Card>
  );
}
