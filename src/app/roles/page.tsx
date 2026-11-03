import type { Metadata } from "next";
import { RoleCards } from "@/components/role-cards";
import { ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Choose your role" };

export default async function Roles() {
  const l = await getLocale();
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-navy-900">{ui[l].rolesTitle}</h1>
        <p className="mt-1 text-muted">{ui[l].rolesSub}</p>
      </header>
      <RoleCards locale={l} />
      <p className="text-center text-sm font-medium text-muted">{ui[l].safeLine}</p>
    </div>
  );
}
