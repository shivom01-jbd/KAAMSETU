import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { pages, ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Help and contact" };

export default async function Page() {
  const l = await getLocale();
  const p = pages.help;
  return (
    <ContentPage
      title={ui[l].helpTitle}
      intro={p.intro[l]}
      sections={p.sections[l]}
      backLabel={ui[l].back}
    />
  );
}
