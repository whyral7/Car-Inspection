import type { NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (isAppRoute && !isSignedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (pathname === "/login" && isSignedIn) {
    return redirectWithCookies(new URL("/app", request.url), response);
  }

  return response;
}

export const config = {
  // Skip static assets, PWA files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|api/razorpay/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
