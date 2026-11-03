"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/auth/actions";
import { sendMessage } from "@/app/messages/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import type { SocialText } from "@/lib/social-text";

const initial: FormState = {};

export function ChatForm({
  bookingId,
  text,
  closed,
}: {
  bookingId: string;
  text: SocialText;
  closed: boolean;
}) {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const ref = useRef<HTMLFormElement>(null);
  const t = text as Record<string, string>;
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  if (closed) return <Alert kind="info">{text.chatClosed}</Alert>;
  return (
    <form ref={ref} action={action} className="space-y-2">
      {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
      <input type="hidden" name="booking_id" value={bookingId} />
      <label htmlFor="body" className="sr-only">
        {text.typeMessage}
      </label>
      <textarea
        id="body"
        name="body"
        required
        maxLength={2000}
        placeholder={text.typeMessage}
        className="min-h-20 w-full rounded-xl border border-line bg-white p-3"
      />
      <Button type="submit" loading={pending}>
        {text.send}
      </Button>
    </form>
  );
}
