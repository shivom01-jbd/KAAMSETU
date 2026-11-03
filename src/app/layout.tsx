import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KAAMSETU", template: "%s | KAAMSETU" },
  description: "हर कौशल को काम से जोड़ने का सेतु — find verified skilled professionals near you.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b2a7a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
        >
          Skip to content
        </a>
        <div className="mx-auto min-h-dvh w-full max-w-md px-5 py-6">
          <SiteHeader locale={locale} />
          <main id="main">{children}</main>
          <SiteFooter locale={locale} />
        </div>
      </body>
    </html>
  );
}
