"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions";
import { setAvailability } from "@/app/dashboard/actions";
import { Alert } from "@/components/ui/feedback";

const initial: FormState = {};

export function AvailabilityToggle({
  available,
  onLabel,
  offLabel,
  actionLabel,
  error,
}: {
  available: boolean;
  onLabel: string;
  offLabel: string;
  actionLabel: string;
  error: string;
}) {
  const [state, action, pending] = useActionState(setAvailability, initial);
  return (
    <form action={action} className="space-y-2">
      {state.error && <Alert kind="error">{error}</Alert>}
      <input type="hidden" name="available" value={available ? "false" : "true"} />
      <p className="font-semibold">{available ? onLabel : offLabel}</p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-xl border border-line bg-white font-semibold text-navy-900 disabled:opacity-60"
      >
        {actionLabel}
      </button>
    </form>
  );
}
