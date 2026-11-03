import { setLocale } from "@/app/actions";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/messages";

const options: { value: Locale; label: string }[] = [
  { value: "hi", label: "हिंदी" },
  { value: "en", label: "English" },
];

export function LanguageSwitch({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form
      action={setLocale}
      aria-label={label}
      className="inline-flex rounded-full border border-line bg-white p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="submit"
          name="locale"
          value={o.value}
          aria-pressed={locale === o.value}
          className={cn(
            "min-h-9 rounded-full px-3 text-sm font-semibold",
            locale === o.value ? "bg-navy-900 text-white" : "text-navy-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </form>
  );
}
