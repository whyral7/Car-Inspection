import Link from "next/link";
import { BUSINESS } from "@/lib/config";
import { t } from "@/lib/strings";

type Section = { heading: string; body: readonly string[] };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: readonly Section[] }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-brand-700">
        ← {t.legal.back}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{t.legal.updated(BUSINESS.legalUpdated)}</p>
      <p className="mt-4 leading-relaxed text-slate-700">{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="mt-6">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          {section.body.length > 1 ? (
            <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-slate-700">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 leading-relaxed text-slate-700">{section.body[0]}</p>
          )}
        </section>
      ))}
    </article>
  );
}
