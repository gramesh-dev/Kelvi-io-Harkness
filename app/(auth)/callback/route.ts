import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth PKCE return — keep minimal; session cookies via `cookies()` in Route Handlers. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/post-login`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
