import type { Metadata } from "next";
import Link from "next/link";
import { categories, ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Service categories" };

export default async function Categories() {
  const l = await getLocale();
  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm font-semibold text-brand-600">
        ← {ui[l].back}
      </Link>
      <h1 className="text-3xl font-extrabold text-navy-900">{ui[l].categoriesTitle}</h1>
      <p className="text-muted">{ui[l].categoriesIntro}</p>
      <ul className="grid grid-cols-2 gap-3">
        {categories.map((c) => (
          <li
            key={c.slug}
            className="flex flex-col items-center gap-2 rounded-(--radius-card) border border-line bg-white p-4 text-center"
          >
            <span aria-hidden className="text-3xl">
              {c.icon}
            </span>
            <span className="text-sm font-semibold text-navy-900">{c.name[l]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
