import type { Metadata } from "next";
import { BackLink } from "@/components/ui";
import { ChatIcon } from "@/components/icons";
import { BUSINESS } from "@/lib/config";
import { formatPhone, whatsappChatUrl } from "@/lib/report/share";
import { en as t } from "@/lib/strings";
import { legal } from "@/lib/strings-legal";

const copy = legal.contact;

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
      <BackLink href="/">{legal.back}</BackLink>
      <h1 className="mt-2 text-title font-bold">{copy.title}</h1>
      <p className="mt-2 text-ink-muted">{copy.intro}</p>
      <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 p-4">
            <dt className="text-small text-ink-muted">{row.label}</dt>
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
        <a href={chat} target="_blank" rel="noopener" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-control bg-whatsapp px-5 font-semibold text-white active:bg-whatsapp-pressed">
          <ChatIcon />
          {t.home.whatsapp}
        </a>
      )}
      <p className="mt-6 text-small text-ink-muted">{copy.paymentHelp}</p>
    </article>
  );
}
