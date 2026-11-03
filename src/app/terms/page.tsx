import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { pages, ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Terms" };

export default async function Page() {
  const l = await getLocale();
  const p = pages.terms;
  return (
    <ContentPage
      title={ui[l].termsTitle}
      intro={p.intro[l]}
      sections={p.sections[l]}
      backLabel={ui[l].back}
      draftNote={ui[l].draftNote}
    />
  );
}
