"use client";

import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { LocationPicker, type LocationText } from "@/components/location-picker";
import type { AuthText } from "@/lib/auth-text";

type Cat = { id: string; name: string };
const initial: FormState = {};

export function ProfileForm({
  role,
  text,
  categories,
  locText,
  locTitle,
  locHint,
}: {
  role: "professional" | "business";
  text: AuthText;
  categories: Cat[];
  locText: LocationText;
  locTitle: string;
  locHint: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  const t = text as Record<string, string>;
  const fe = (f: string) => (state.fieldErrors?.[f] ? text.invalid : undefined);
  const area = "min-h-24 w-full rounded-xl border border-line bg-white p-4";
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
      {state.message && <Alert kind="info">{t[state.message] ?? state.message}</Alert>}
      {role === "professional" ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="category_id" className="text-sm font-medium text-navy-900">
              {text.category}
            </label>
            <select
              id="category_id"
              name="category_id"
              required
              className="min-h-12 w-full rounded-xl border border-line bg-white px-3"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fe("category_id") && (
              <p role="alert" className="text-sm text-danger">
                {fe("category_id")}
              </p>
            )}
          </div>
          <Input
            label={text.experience}
            name="experience_years"
            type="number"
            min={0}
            max={60}
            error={fe("experience_years")}
          />
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-navy-900">
              {text.bio}
            </label>
            <textarea id="bio" name="bio" maxLength={1000} className={area} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={text.priceMin}
              name="price_min_inr"
              type="number"
              min={0}
              error={fe("price_min_inr")}
            />
            <Input
              label={text.priceMax}
              name="price_max_inr"
              type="number"
              min={0}
              error={fe("price_max_inr")}
            />
          </div>
          <Input label={text.city} name="city" maxLength={80} error={fe("city")} />
          <Input label={text.area} name="area_label" maxLength={80} error={fe("area_label")} />
          <fieldset className="space-y-2 rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-navy-900">{locTitle}</legend>
            <p className="text-sm text-muted">{locHint}</p>
            <LocationPicker latName="approx_lat" lngName="approx_lng" text={locText} />
          </fieldset>
          <fieldset className="space-y-2 rounded-xl border border-line p-3">
            <legend className="px-1 text-sm font-semibold text-navy-900">{locTitle}</legend>
            <p className="text-sm text-muted">{locHint}</p>
            <LocationPicker latName="approx_lat" lngName="approx_lng" text={locText} />
          </fieldset>
          <Input
            label={text.radius}
            name="service_radius_km"
            type="number"
            min={1}
            max={100}
            defaultValue={5}
            error={fe("service_radius_km")}
          />
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" name="is_available" defaultChecked /> {text.available}
          </label>
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" name="is_listed" /> {text.listed}
          </label>
        </>
      ) : (
        <>
          <Input label={text.company} name="company_name" required error={fe("company_name")} />
          <Input label={text.city} name="city" error={fe("city")} />
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-navy-900">
              {text.description}
            </label>
            <textarea id="description" name="description" maxLength={1000} className={area} />
          </div>
        </>
      )}
      <Button type="submit" loading={pending}>
        {text.save}
      </Button>
    </form>
  );
}
