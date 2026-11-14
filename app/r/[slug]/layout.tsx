import { LocaleRoot } from "@/components/locale-root";

export default function PublicReportLayout({ children }: LayoutProps<"/r/[slug]">) {
  return <LocaleRoot>{children}</LocaleRoot>;
}
