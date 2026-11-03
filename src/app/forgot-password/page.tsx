import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { authText } from "@/lib/auth-text";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Forgot password" };

export default async function Page() {
  const l = await getLocale();
  const text = authText[l];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-navy-900">{text.forgot}</h1>
      <AuthForm mode="forgot" text={text} />
    </div>
  );
}
