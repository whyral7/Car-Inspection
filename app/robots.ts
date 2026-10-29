import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Public pages can be indexed. The dealer app and APIs can't. Report pages (/r/...) stay crawlable so
// WhatsApp can build link previews; they carry noindex themselves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/api/", "/auth/", "/login"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
