import { LocaleRoot } from "@/components/locale-root";

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return <LocaleRoot>{children}</LocaleRoot>;
}
