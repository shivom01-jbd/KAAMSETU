import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentPage } from "@/components/content-page";
import { RoleCards } from "@/components/role-cards";
import { categories, pages, ui } from "@/lib/content";

vi.mock("@/app/actions", () => ({ setLocale: vi.fn() }));

describe("content integrity", () => {
  it("has identical ui keys and unique category slugs", () => {
    expect(Object.keys(ui.hi).sort()).toEqual(Object.keys(ui.en).sort());
    expect(new Set(categories.map((c) => c.slug)).size).toBe(categories.length);
  });
  it("has the same number of sections in both languages", () => {
    for (const p of Object.values(pages)) {
      expect(p.sections.hi.length).toBe(p.sections.en.length);
    }
  });
});

describe("public components", () => {
  it("role cards link to the register flow with the right role", () => {
    render(<RoleCards locale="en" />);
    expect(screen.getByRole("link", { name: /I am PEOPLE/ })).toHaveAttribute(
      "href",
      "/register?role=people",
    );
    expect(screen.getByRole("link", { name: /I am BUSINESS/ })).toHaveAttribute(
      "href",
      "/register?role=business",
    );
  });
  it("shows the draft warning on legal pages", () => {
    render(
      <ContentPage
        title="Terms"
        intro="x"
        sections={pages.terms.sections.en}
        draftNote={ui.en.draftNote}
        backLabel="Back"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("lawyer");
  });
  it("language switch posts only hi/en values", async () => {
    const { LanguageSwitch } = await import("@/components/language-switch");
    render(<LanguageSwitch locale="hi" label="Language" />);
    expect(screen.getByRole("button", { name: "हिंदी" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("value", "en");
  });
});
