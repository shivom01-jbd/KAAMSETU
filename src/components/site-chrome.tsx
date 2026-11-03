import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/ui/logo";
import { ui } from "@/lib/content";
import type { Locale } from "@/lib/i18n/messages";

export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link href="/" aria-label="KAAMSETU" className="flex items-center gap-2">
        <LogoMark className="h-9 w-8" />
        <span className="text-lg font-extrabold text-navy-900">
          KAAM<span className="text-leaf-600">SETU</span>
        </span>
      </Link>
      <LanguageSwitch locale={locale} label={ui[locale].language} />
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const u = ui[locale];
  const links = [
    ["/categories", u.categoriesTitle],
    ["/how-it-works", u.howTitle],
    ["/trust-and-safety", u.trustTitle],
    ["/terms", u.termsTitle],
    ["/privacy", u.privacyTitle],
    ["/help", u.footerHelp],
  ] as const;
  return (
    <footer className="mt-10 border-t border-line pt-5">
      <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="font-medium hover:text-brand-600">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
