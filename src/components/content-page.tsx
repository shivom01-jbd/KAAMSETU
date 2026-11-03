import Link from "next/link";
import { Alert } from "@/components/ui/feedback";
import type { Section } from "@/lib/content";

export function ContentPage({
  title,
  intro,
  sections,
  draftNote,
  backLabel,
}: {
  title: string;
  intro: string;
  sections: Section[];
  draftNote?: string;
  backLabel: string;
}) {
  return (
    <article className="space-y-5">
      <Link href="/" className="text-sm font-semibold text-brand-600">
        ← {backLabel}
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{title}</h1>
      <p className="text-muted">{intro}</p>
      {draftNote && <Alert kind="info">{draftNote}</Alert>}
      {sections.map((s) => (
        <section
          key={s.heading}
          className="rounded-(--radius-card) border border-line bg-white p-5"
        >
          <h2 className="text-lg font-bold text-navy-900">{s.heading}</h2>
          <p className="mt-1 text-ink/80">{s.body}</p>
        </section>
      ))}
    </article>
  );
}
