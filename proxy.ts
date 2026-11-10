import type { NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const session = await updateSession(request);
  const { isSignedIn } = session;
  const { pathname, search } = request.nextUrl;

  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (isAppRoute && !isSignedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, session.response);
  }

  if (pathname === "/login" && (await session.confirmSignedIn())) {
    return redirectWithCookies(new URL("/app", request.url), session.response);
  }

  return session.response;
}

export const config = {
  // Skip static assets, PWA files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|api/razorpay/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
