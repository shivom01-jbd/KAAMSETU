import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { authText } from "@/lib/auth-text";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const l = await getLocale();
  const text = authText[l];
  const { role } = await searchParams;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-navy-900">{text.register}</h1>
      <AuthForm
        mode="register"
        text={text}
        defaultRole={role === "business" ? "business" : "customer"}
      />
    </div>
  );
}
