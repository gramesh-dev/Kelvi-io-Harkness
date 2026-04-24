import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Temporary diagnostic endpoint.
 * Visit: https://kelvi-umber.vercel.app/api/debug-cookies
 * Shows which cookies the server sees and whether getUser() works.
 * DELETE this file once the cookie issue is confirmed fixed.
 */
export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const supabaseCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  let userId: string | null = null;
  let userEmail: string | null = null;
  let getUserError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
    userEmail = data?.user?.email ?? null;
    getUserError = error?.message ?? null;
  } catch (e) {
    getUserError = String(e);
  }

  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookieNames: supabaseCookies.map((c) => c.name),
    hasSbCookies: supabaseCookies.length > 0,
    getUser: { userId, userEmail, error: getUserError },
    env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnonKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
