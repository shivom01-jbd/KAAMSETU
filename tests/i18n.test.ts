import { describe, expect, it } from "vitest";
import { isLocale, messages, t } from "@/lib/i18n/messages";

describe("i18n", () => {
  it("has identical keys in every locale", () => {
    expect(Object.keys(messages.hi).sort()).toEqual(Object.keys(messages.en).sort());
  });
  it("validates locales and translates", () => {
    expect(isLocale("hi")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(t("en", "login")).toBe("Log in");
  });
});
