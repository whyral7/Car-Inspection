import type { MetadataRoute } from "next";
import { APP_NAME, BACKGROUND_COLOR, THEME_COLOR } from "@/lib/config";
import { en as t } from "@/lib/strings";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: APP_NAME,
    short_name: APP_NAME,
    description: t.tagline,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    lang: "en-IN",
    categories: ["business", "productivity"],
    shortcuts: [
      { name: t.cars.addTitle, short_name: t.dashboard.addCar, url: "/app/cars/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t.dashboard.myCars, url: "/app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
