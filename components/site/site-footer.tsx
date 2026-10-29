import Link from "next/link";
import { APP_NAME, BUSINESS } from "@/lib/config";
import { en as t } from "@/lib/strings";

const links = [
  { href: "/privacy", label: t.site.footer.privacy },
  { href: "/terms", label: t.site.footer.terms },
  { href: "/refunds", label: t.site.footer.refunds },
  { href: "/contact", label: t.site.footer.contact },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {/* Bottom padding keeps the last line clear of the floating WhatsApp button, when there is one. */}
      <div className={`mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-8 ${BUSINESS.whatsapp ? "pb-24" : "pb-8"}`}>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center text-small font-medium text-ink-muted">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-caption text-ink-muted">{t.disclaimer}</p>
        <p className="text-caption text-ink-muted">{t.site.footer.rights(new Date().getFullYear(), BUSINESS.legalName.startsWith("[") ? APP_NAME : BUSINESS.legalName)}</p>
      </div>
    </footer>
  );
}
