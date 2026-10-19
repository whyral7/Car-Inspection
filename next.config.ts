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
