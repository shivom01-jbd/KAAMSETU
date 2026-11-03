import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

function PhoneArt() {
  const pins = [
    ["50%", "46%", "#3c9a1e", 22],
    ["30%", "22%", "#1565e8", 16],
    ["72%", "24%", "#f59e0b", 16],
    ["28%", "72%", "#0b2a7a", 16],
    ["72%", "74%", "#1565e8", 16],
  ] as const;
  return (
    <div
      aria-hidden
      className="relative mx-auto h-56 w-36 rounded-[2rem] border-[6px] border-navy-900 bg-brand-50"
    >
      {pins.map(([left, top, color, size], i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left, top, width: size * 1.6, height: size * 1.6, background: color }}
        />
      ))}
    </div>
  );
}

export default async function Home() {
  const l = await getLocale();
  return (
    <div className="flex min-h-[75dvh] flex-col items-center justify-between gap-7">
      <Logo tagline={t(l, "tagline")} />
      <section className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-navy-900">WELCOME</h1>
        <p className="mt-3 text-lg font-medium">
          {t(l, "welcome")} <span className="font-extrabold text-navy-900">KAAM</span>
          <span className="font-extrabold text-leaf-600">SETU</span>
        </p>
        <p className="mx-auto mt-2 max-w-xs text-muted">{t(l, "welcomeSub")}</p>
      </section>
      <PhoneArt />
      <div className="w-full space-y-3 text-center">
        <Link
          href="/roles"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 font-semibold text-white shadow-sm"
        >
          {t(l, "register").toUpperCase()} →
        </Link>
        <p className="text-sm text-muted">
          {t(l, "or")} · {t(l, "haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-600 underline">
            {t(l, "login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
