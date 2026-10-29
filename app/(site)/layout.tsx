import { I18nProvider } from "@/components/i18n-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ToastProvider } from "@/components/ui";

// Public marketing and legal pages. No login, no cookies read, so they render as static pages, in English.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <I18nProvider locale="en">
      <ToastProvider>
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </ToastProvider>
    </I18nProvider>
  );
}
