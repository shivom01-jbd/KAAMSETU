export const locales = ["hi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "hi";

export const messages = {
  hi: {
    tagline: "हर कौशल को काम से जोड़ने का सेतु",
    welcome: "आपका स्वागत है",
    welcomeSub: "यहाँ आप सही लोगों से जुड़ सकते हैं और बेहतरीन अवसर प्राप्त कर सकते हैं।",
    register: "रजिस्टर करें",
    or: "या",
    haveAccount: "पहले से खाता है?",
    login: "लॉगिन करें",
    loading: "लोड हो रहा है…",
    emptyTitle: "अभी कुछ नहीं है",
  },
  en: {
    tagline: "The bridge that connects every skill to work",
    welcome: "Welcome",
    welcomeSub: "Connect with the right people and find better opportunities.",
    register: "Register",
    or: "or",
    haveAccount: "Already have an account?",
    login: "Log in",
    loading: "Loading…",
    emptyTitle: "Nothing here yet",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["en"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
