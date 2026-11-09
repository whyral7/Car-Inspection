import type { Metadata, Viewport } from "next";
import { martelSans, plexMono } from "@/brand/next/fonts";
import { I18nProvider } from "@/components/i18n-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { APP_NAME, THEME_COLOR } from "@/lib/config";
import { publicEnv } from "@/lib/env";
import { OG_LOCALE } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n.server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return {
    // Makes relative Open Graph URLs absolute. The public report sets absolute ones itself.
    metadataBase: publicEnv.NEXT_PUBLIC_APP_URL ? new URL(publicEnv.NEXT_PUBLIC_APP_URL) : undefined,
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t.tagline,
    applicationName: APP_NAME,
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
    formatDetection: { telephone: false },
    // Pages set their own Open Graph title and description where they're worth sharing.
    openGraph: { type: "website", siteName: APP_NAME, locale: OG_LOCALE[locale] },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="light" className={`h-full ${martelSans.variable} ${plexMono.variable}`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
