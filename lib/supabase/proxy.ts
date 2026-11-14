import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Refreshes the auth session cookie and returns the response plus whether a user is signed in. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims: it is what refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  /**
   * getClaims only checks the token's signature, so a session revoked elsewhere (logged out on the
   * server, user removed) still looks signed in until the token expires. Pages check with the auth
   * server and send people to /login, so /login must too, or the two bounce each other forever.
   * This asks the auth server and clears dead cookies; only /login calls it, so it costs one request there.
   */
  async function confirmSignedIn() {
    if (!isSignedIn) return false;
    const { data: user, error } = await supabase.auth.getUser();
    if (user.user) return true;
    // Only a definite "no" from the auth server clears cookies; a network blip just shows the login page.
    if (error?.status === 401 || error?.status === 403) await supabase.auth.signOut({ scope: "local" });
    return false;
  }

  return { get response() { return response; }, isSignedIn, confirmSignedIn };
}

/** Copies refreshed auth cookies onto a redirect so the session isn't lost. */
export function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
