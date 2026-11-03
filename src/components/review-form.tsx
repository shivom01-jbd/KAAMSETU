"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions";
import { createReview } from "@/app/reviews/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import type { SocialText } from "@/lib/social-text";

const initial: FormState = {};

export function ReviewForm({ bookingId, text }: { bookingId: string; text: SocialText }) {
  const [state, action, pending] = useActionState(createReview, initial);
  const t = text as Record<string, string>;
  if (state.message) return <Alert kind="info">{text.reviewed}</Alert>;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line p-3">
      <p className="font-semibold text-navy-900">{text.leaveReview}</p>
      {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
      <input type="hidden" name="booking_id" value={bookingId} />
      <div className="space-y-1.5">
        <label htmlFor={`r-${bookingId}`} className="text-sm font-medium">
          {text.rating}
        </label>
        <select
          id={`r-${bookingId}`}
          name="rating"
          defaultValue="5"
          className="min-h-11 w-full rounded-xl border border-line bg-white px-3"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {t[`stars${n}`]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`c-${bookingId}`} className="text-sm font-medium">
          {text.comment}
        </label>
        <textarea
          id={`c-${bookingId}`}
          name="comment"
          maxLength={1000}
          className="min-h-20 w-full rounded-xl border border-line bg-white p-3"
        />
      </div>
      <Button type="submit" loading={pending}>
        {text.submitReview}
      </Button>
    </form>
  );
}
