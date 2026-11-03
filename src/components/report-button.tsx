"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions";
import { reportContent } from "@/app/reviews/actions";
import { Alert } from "@/components/ui/feedback";
import type { SocialText } from "@/lib/social-text";

const initial: FormState = {};

export function ReportButton({
  targetType,
  targetId,
  text,
}: {
  targetType: "review" | "message" | "profile";
  targetId: string;
  text: SocialText;
}) {
  const [state, action, pending] = useActionState(reportContent, initial);
  const t = text as Record<string, string>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-muted">{text.report}</summary>
      {state.message ? (
        <Alert kind="info">{t[state.message] ?? text.reportThanks}</Alert>
      ) : (
        <form action={action} className="mt-2 space-y-2">
          {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <label htmlFor={`rp-${targetId}`} className="sr-only">
            {text.reportReason}
          </label>
          <textarea
            id={`rp-${targetId}`}
            name="reason"
            required
            minLength={5}
            maxLength={500}
            placeholder={text.reportReason}
            className="min-h-16 w-full rounded-xl border border-line bg-white p-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-xl border border-danger px-3 font-semibold text-danger disabled:opacity-60"
          >
            {text.reportSend}
          </button>
        </form>
      )}
    </details>
  );
}
