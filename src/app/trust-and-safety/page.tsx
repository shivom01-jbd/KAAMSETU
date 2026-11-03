import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { pages, ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Trust and safety" };

export default async function Page() {
  const l = await getLocale();
  const p = pages.trust;
  return (
    <ContentPage
      title={ui[l].trustTitle}
      intro={p.intro[l]}
      sections={p.sections[l]}
      backLabel={ui[l].back}
    />
  );
}
