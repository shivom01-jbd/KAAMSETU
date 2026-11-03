"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions";
import { createBooking } from "@/app/bookings/actions";
import { LocationPicker, type LocationText } from "@/components/location-picker";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import type { BookingText } from "@/lib/bookings-text";

const initial: FormState = {};

export function BookingForm({
  professionalId,
  text,
  locText,
}: {
  professionalId: string;
  text: BookingText;
  locText: LocationText;
}) {
  const [state, action, pending] = useActionState(createBooking, initial);
  const t = text as Record<string, string>;
  const fe = (f: string) => (state.fieldErrors?.[f] ? text.invalid : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
      <input type="hidden" name="professional_id" value={professionalId} />
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-navy-900">
          {text.describe}
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={1000}
          aria-invalid={fe("description") ? true : undefined}
          className="min-h-28 w-full rounded-xl border border-line bg-white p-4"
        />
        <p className="text-sm text-muted">{fe("description") ?? text.describeHint}</p>
      </div>
      <Input
        label={text.when}
        name="preferred_at"
        type="datetime-local"
        required
        error={fe("preferred_at")}
      />
      <Input label={text.area} name="area_label" maxLength={80} error={fe("area_label")} />
      <LocationPicker latName="approx_lat" lngName="approx_lng" text={locText} />
      <Button type="submit" loading={pending}>
        {text.submit}
      </Button>
    </form>
  );
}
