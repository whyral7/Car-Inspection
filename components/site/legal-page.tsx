import { BackLink } from "@/components/ui";
import { BUSINESS } from "@/lib/config";
import { legal } from "@/lib/strings-legal";

type Section = { heading: string; body: readonly string[] };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: readonly Section[] }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8">
      <BackLink href="/">{legal.back}</BackLink>
      <h1 className="mt-2 text-title font-bold">{title}</h1>
      <p className="mt-1 text-small text-ink-muted">{legal.updated(BUSINESS.legalUpdated)}</p>
      <p className="mt-4 leading-relaxed text-ink-muted">{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="mt-6">
          <h2 className="text-heading font-semibold">{section.heading}</h2>
          {section.body.length > 1 ? (
            <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 leading-relaxed text-ink-muted">{section.body[0]}</p>
          )}
        </section>
      ))}
    </article>
  );
}
