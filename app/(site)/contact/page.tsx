import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button";
import { ChatIcon } from "@/components/icons";
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
      <Link href="/" className="-ml-1 inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent">
        ← {t.legal.back}
      </Link>
      <h1 className="mt-2 type-heading-1">{copy.title}</h1>
      <p className="mt-2 text-text-muted">{copy.intro}</p>
      <dl className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 p-4">
            <dt className="text-sm text-text-subtle">{row.label}</dt>
            <dd className="font-medium break-words">
              {row.href ? (
                <a href={row.href} className="text-accent underline" {...(row.href.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
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
        <a href={chat} target="_blank" rel="noopener" className={buttonClass("primary", "mt-6 w-full")}>
          <ChatIcon size={18} />
          {t.home.whatsapp}
        </a>
      )}
      <p className="mt-6 text-sm text-text-subtle">{copy.paymentHelp}</p>
    </article>
  );
}
