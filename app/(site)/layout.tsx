import { LocaleRoot } from "@/components/locale-root";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

// Public marketing and legal pages, in the visitor's language (legal text itself stays English).
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <LocaleRoot>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </LocaleRoot>
  );
}
