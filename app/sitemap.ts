import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/sample-report", priority: 0.8 },
    { path: "/contact", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/refunds", priority: 0.3 },
  ];
  return pages.map((p) => ({ url: `${base}${p.path === "/" ? "" : p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
