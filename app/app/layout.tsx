import { LocaleRoot } from "@/components/locale-root";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <LocaleRoot>{children}</LocaleRoot>;
}
