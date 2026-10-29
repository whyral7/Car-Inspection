import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { APP_NAME, THEME_COLOR } from "@/lib/config";
import { publicEnv } from "@/lib/env";
import { en as t } from "@/lib/strings";
import "./globals.css";

export const metadata: Metadata = {
  // Makes relative Open Graph URLs absolute. The public report sets absolute ones itself.
  metadataBase: publicEnv.NEXT_PUBLIC_APP_URL ? new URL(publicEnv.NEXT_PUBLIC_APP_URL) : undefined,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: t.tagline,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
  // Pages set their own Open Graph title and description where they're worth sharing.
  openGraph: { type: "website", siteName: APP_NAME, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Self-hosted Geist (28 KB, cached by the service worker). Other scripts fall back to the system font. */}
        <link rel="preload" href="/fonts/Geist-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
