import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/config";
import { formatPhone, whatsappChatUrl } from "@/lib/report/share";
import { t } from "@/lib/strings";

const copy = t.legal.contact;

export const metadata: Metadata = { title: copy.title, alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const chat = whatsappChatUrl(BUSINESS.whatsapp, t.home.whatsappMessage);
  const rows = [
    { label: copy.business, value: BUSINESS.legalName },
    { label: copy.address, value: BUSINESS.address },
    { label: copy.email, value: BUSINESS.email, href: BUSINESS.email.includes("@") && !BUSINESS.email.startsWith("[") ? `mailto:${BUSINESS.email}` : undefined },
    ...(chat ? [{ label: copy.whatsapp, value: formatPhone(BUSINESS.whatsapp) ?? BUSINESS.whatsapp, href: chat }] : []),
    { label: copy.hours, value: BUSINESS.supportHours },
  ];

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-brand-700">
        ← {t.legal.back}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-slate-700">{copy.intro}</p>
      <dl className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 p-4">
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="font-medium break-words">
              {row.href ? (
                <a href={row.href} className="text-brand-700 underline" {...(row.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {chat && (
        <a href={chat} target="_blank" rel="noopener" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-5 font-semibold text-white active:bg-[#075e54]">
          <span aria-hidden>💬</span>
          {t.home.whatsapp}
        </a>
      )}
      <p className="mt-6 text-sm text-slate-500">{copy.paymentHelp}</p>
    </article>
  );
}
