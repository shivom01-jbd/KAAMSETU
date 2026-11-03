"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/auth/actions";
import { Alert } from "@/components/ui/feedback";
import { adminErrors } from "@/lib/admin-text";
import { cn } from "@/lib/cn";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
const initial: FormState = {};

/** Generic confirm-then-submit button for admin actions. Hidden fields carry only ids and enum values. */
export function ConfirmSubmit({
  action,
  fields,
  label,
  body = "This action is recorded in the audit log.",
  danger = false,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  body?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form
      action={(fd) => {
        setOpen(false);
        formAction(fd);
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "min-h-10 rounded-xl px-3 text-sm font-semibold",
          danger ? "border border-danger text-danger" : "bg-brand-600 text-white",
        )}
      >
        {label}
      </button>
      {state.error && (
        <div className="mt-1">
          <Alert kind="error">{adminErrors[state.error] ?? adminErrors.failed}</Alert>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-navy-900">{label}?</h2>
            <p className="text-sm text-muted">{body}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 flex-1 rounded-xl border border-line font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className={cn(
                  "min-h-11 flex-1 rounded-xl font-semibold text-white disabled:opacity-60",
                  danger ? "bg-danger" : "bg-brand-600",
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
