import type { NextConfig } from "next";

// Phones on the same Wi-Fi hit the dev server by LAN IP. Next blocks dev assets
// from unknown origins, so allow the usual private ranges plus an optional override.
const lanOrigins = [
  "192.168.*.*",
  "10.*.*.*",
  ...(process.env.DEV_LAN_ORIGIN ? [process.env.DEV_LAN_ORIGIN] : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins,
  // The PDF and the link preview images read the brand fonts and logo files from disk at runtime. The PDF is also built
  // after publishing, from the report screen's server action.
  outputFileTracingIncludes: {
    "/r/**": ["./assets/fonts/*.ttf", "./assets/brand/*"],
    "/app/cars/**": ["./assets/fonts/*.ttf", "./assets/brand/*"],
    "/opengraph-image": ["./assets/fonts/*.ttf", "./assets/brand/*"],
  },
  async headers() {
    return [
      {
        // Always fetch a fresh service worker so updates roll out immediately.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
