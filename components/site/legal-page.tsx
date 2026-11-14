import { BackLink } from "@/components/ui";
import { BUSINESS } from "@/lib/config";
import { legal } from "@/lib/strings-legal";

type Section = { heading: string; body: readonly string[] };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: readonly Section[] }) {
  return (
    // Legal text is English only, so say so for screen readers even when the site is in Hindi.
    <article lang="en" className="mx-auto w-full max-w-2xl px-4 py-8">
      <BackLink href="/">{legal.back}</BackLink>
      <h1 className="mt-2 type-heading-1">{title}</h1>
      <p className="mt-1 type-body-sm text-text-muted">{legal.updated(BUSINESS.legalUpdated)}</p>
      <p className="mt-4 max-w-[28rem] leading-relaxed text-text-muted">{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="mt-6">
          <h2 className="type-heading-2">{section.heading}</h2>
          {section.body.length > 1 ? (
            <ul className="mt-2 max-w-[28rem] list-disc space-y-2 pl-5 leading-relaxed text-text-muted">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 max-w-[28rem] leading-relaxed text-text-muted">{section.body[0]}</p>
          )}
        </section>
      ))}
    </article>
  );
}
