import Link from "next/link";
import { BUSINESS } from "@/lib/config";
import { getT } from "@/lib/i18n.server";

export async function SiteFooter() {
  const t = await getT();
  const links = [
    { href: "/privacy", label: t.site.footer.privacy },
    { href: "/terms", label: t.site.footer.terms },
    { href: "/refunds", label: t.site.footer.refunds },
    { href: "/contact", label: t.site.footer.contact },
  ];
  return (
    <footer className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      {/* Bottom padding keeps the last line clear of the floating WhatsApp button. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-8 pb-24">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center text-sm font-medium text-text-muted">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-subtle">{t.disclaimer}</p>
        <p className="text-xs text-text-subtle">{t.site.footer.rights(new Date().getFullYear(), BUSINESS.legalName)}</p>
      </div>
    </footer>
  );
}
