import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * The public base URL for links that leave the app (WhatsApp shares, the PDF, link previews).
 * NEXT_PUBLIC_APP_URL when set, otherwise the host this request came in on.
 */
export async function appBaseUrl() {
  if (publicEnv.NEXT_PUBLIC_APP_URL) return publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (/^(localhost|127\.|192\.168\.|10\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
