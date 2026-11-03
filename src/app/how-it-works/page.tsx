import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { pages, ui } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "How it works" };

export default async function Page() {
  const l = await getLocale();
  const p = pages.how;
  return (
    <ContentPage
      title={ui[l].howTitle}
      intro={p.intro[l]}
      sections={p.sections[l]}
      backLabel={ui[l].back}
    />
  );
}
