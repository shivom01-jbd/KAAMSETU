"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset, signIn, signUp, updatePassword, type FormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import type { AuthText } from "@/lib/auth-text";

export type AuthMode = "register" | "login" | "forgot" | "reset";
const actions = { register: signUp, login: signIn, forgot: requestReset, reset: updatePassword };
const initial: FormState = {};

export function AuthForm({
  mode,
  text,
  defaultRole = "customer",
}: {
  mode: AuthMode;
  text: AuthText;
  defaultRole?: string;
}) {
  const [state, action, pending] = useActionState(actions[mode], initial);
  const t = text as Record<string, string>;
  const fe = (f: string) => (state.fieldErrors?.[f] ? t.invalid : undefined);
  const submit = {
    register: text.submitRegister,
    login: text.submitLogin,
    forgot: text.submitForgot,
    reset: text.submitReset,
  }[mode];
  const roles = defaultRole === "business" ? ["business"] : ["customer", "professional"];
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert kind="error">{t[state.error] ?? text.failed}</Alert>}
      {state.message && <Alert kind="info">{t[state.message] ?? state.message}</Alert>}
      {mode === "register" && (
        <Input
          label={text.name}
          name="full_name"
          autoComplete="name"
          required
          error={fe("full_name")}
        />
      )}
      {mode !== "reset" && (
        <Input
          label={text.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fe("email")}
        />
      )}
      {mode !== "forgot" && (
        <Input
          label={text.password}
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          error={fe("password")}
          hint={mode === "login" ? undefined : text.passwordHint}
        />
      )}
      {mode === "register" && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-navy-900">{text.role}</legend>
          {roles.map((r, i) => (
            <label
              key={r}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4"
            >
              <input type="radio" name="role" value={r} defaultChecked={i === 0} />
              <span>{t[r]}</span>
            </label>
          ))}
        </fieldset>
      )}
      <Button type="submit" loading={pending}>
        {submit}
      </Button>
      {mode === "login" && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-600">
            {text.forgotLink}
          </Link>
        </p>
      )}
      {mode === "login" && (
        <p className="text-center text-sm text-muted">
          {text.noAccount}{" "}
          <Link href="/roles" className="font-semibold text-brand-600">
            {text.register}
          </Link>
        </p>
      )}
      {mode === "register" && (
        <p className="text-center text-sm text-muted">
          {text.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-brand-600">
            {text.login}
          </Link>
        </p>
      )}
    </form>
  );
}
