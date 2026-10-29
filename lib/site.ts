import { BUSINESS } from "@/lib/config";
import { whatsappChatUrl } from "@/lib/report/share";
import { en as t } from "@/lib/strings";

/** "Chat on WhatsApp" target: a chat with BUSINESS.whatsapp, or the contact page until a number is set. */
export function supportWhatsappHref() {
  return whatsappChatUrl(BUSINESS.whatsapp, t.home.whatsappMessage) ?? "/contact";
}

/**
 * "Delete my account" request: WhatsApp support if a number is set, else an email to support, else the
 * contact page. Deletion is handled by hand within 30 days (see the privacy policy).
 */
export function accountDeletionHref(message: string) {
  const chat = whatsappChatUrl(BUSINESS.whatsapp, message);
  if (chat) return chat;
  if (BUSINESS.email.includes("@") && !BUSINESS.email.startsWith("[")) {
    return `mailto:${BUSINESS.email}?subject=${encodeURIComponent("Delete my Treadmark account")}&body=${encodeURIComponent(message)}`;
  }
  return "/contact";
}

/**
 * Canonical site URL for the sitemap and robots.txt, which are built ahead of time (no request to
 * read a host from). NEXT_PUBLIC_APP_URL, else Vercel's production domain, else localhost.
 */
export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return (fromEnv || "http://localhost:3000").replace(/\/+$/, "");
}
