"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/auth/actions";
import { transitionBooking } from "@/app/bookings/actions";
import { Alert } from "@/components/ui/feedback";
import type { BookingText } from "@/lib/bookings-text";
import { cn } from "@/lib/cn";

const initial: FormState = {};

/** A button that asks for confirmation in an accessible modal before submitting the status change. */
export function ConfirmActionForm({
  bookingId,
  to,
  label,
  text,
  danger = false,
}: {
  bookingId: string;
  to: string;
  label: string;
  text: BookingText;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(transitionBooking, initial);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const t = text as Record<string, string>;

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <form
      action={(fd) => {
        setOpen(false);
        action(fd);
      }}
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="to" value={to} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "min-h-11 rounded-xl px-4 text-sm font-semibold",
          danger ? "border border-danger text-danger" : "bg-brand-600 text-white",
        )}
      >
        {label}
      </button>
      {state.error && (
        <div className="mt-2">
          <Alert kind="error">{t[state.error] ?? text.failed}</Alert>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`c-${bookingId}-${to}`}
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 id={`c-${bookingId}-${to}`} className="text-lg font-bold text-navy-900">
              {text.confirmTitle}
            </h2>
            <p className="text-sm text-muted">{text.confirmBody}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 flex-1 rounded-xl border border-line font-semibold"
              >
                {text.back}
              </button>
              <button
                ref={confirmRef}
                type="submit"
                disabled={pending}
                className={cn(
                  "min-h-11 flex-1 rounded-xl font-semibold text-white disabled:opacity-60",
                  danger ? "bg-danger" : "bg-brand-600",
                )}
              >
                {text.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
