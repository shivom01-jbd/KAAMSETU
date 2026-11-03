import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ui } from "@/lib/content";
import type { Locale } from "@/lib/i18n/messages";

const linkBase =
  "mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-base font-semibold text-white";

export function RoleCards({ locale }: { locale: Locale }) {
  const u = ui[locale];
  return (
    <div className="space-y-4">
      <Card tone="people" className="text-center">
        <h2 className="text-2xl font-extrabold text-leaf-700">{u.people}</h2>
        <p className="mt-2 text-sm text-ink/80">{u.peopleDesc}</p>
        <Link href="/register?role=people" className={`${linkBase} bg-leaf-700`}>
          {u.peopleBtn} →
        </Link>
      </Card>
      <Card tone="business" className="text-center">
        <h2 className="text-2xl font-extrabold text-navy-900">{u.business}</h2>
        <p className="mt-2 text-sm text-ink/80">{u.businessDesc}</p>
        <Link href="/register?role=business" className={`${linkBase} bg-navy-900`}>
          {u.businessBtn} →
        </Link>
      </Card>
    </div>
  );
}
