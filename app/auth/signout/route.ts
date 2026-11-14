import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Only this device: the confirm says "on this phone", and other devices stay logged in.
  await supabase.auth.signOut({ scope: "local" });
  // 303 so the browser follows with a GET.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
