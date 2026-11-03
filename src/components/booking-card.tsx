import Link from "next/link";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { ReviewForm } from "@/components/review-form";
import { Card } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/feedback";
import type { BookingText } from "@/lib/bookings-text";
import { allowedTransitions, type ActorKind, type BookingStatus } from "@/lib/bookings/transitions";
import type { Locale } from "@/lib/i18n/messages";
import type { SocialText } from "@/lib/social-text";

export type BookingRow = {
  id: string;
  status: BookingStatus;
  description: string;
  preferred_at: string;
  area_label: string | null;
  category_name?: string;
  counterparty?: string;
  reviewed?: boolean;
};

const tone = (s: BookingStatus) =>
  s === "completed" ? "verified" : s === "cancelled" ? "neutral" : "pending";

function labelFor(from: BookingStatus, to: BookingStatus, kind: ActorKind, t: BookingText) {
  if (to === "accepted") return t.accept;
  if (to === "in_progress") return t.start;
  if (to === "completed") return t.complete;
  if (from === "requested") return kind === "professional" ? t.decline : t.cancelRequest;
  return t.cancelJob;
}

export function BookingCard({
  b,
  kind,
  locale,
  text,
  social,
}: {
  b: BookingRow;
  kind: ActorKind;
  locale: Locale;
  text: BookingText;
  social: SocialText;
}) {
  const when = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(b.preferred_at));
  const actions = allowedTransitions(b.status, kind);
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-navy-900">
          {kind === "professional" ? text.from : text.with}: {b.counterparty ?? "—"}
        </p>
        <Badge tone={tone(b.status)}>{text[b.status]}</Badge>
      </div>
      <p className="text-sm text-muted">
        {[b.category_name, b.area_label].filter(Boolean).join(" · ")}
      </p>
      <p className="whitespace-pre-wrap break-words text-sm">{b.description}</p>
      <p className="text-sm font-semibold text-brand-600">{when}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/messages/${b.id}`}
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-navy-900"
        >
          {social.openChat}
        </Link>
        {actions.map((to) => (
          <ConfirmActionForm
            key={to}
            bookingId={b.id}
            to={to}
            text={text}
            label={labelFor(b.status, to, kind, text)}
            danger={to === "cancelled"}
          />
        ))}
      </div>
      {kind === "customer" &&
        b.status === "completed" &&
        (b.reviewed ? (
          <Alert kind="info">{social.reviewed}</Alert>
        ) : (
          <ReviewForm bookingId={b.id} text={social} />
        ))}
    </Card>
  );
}
