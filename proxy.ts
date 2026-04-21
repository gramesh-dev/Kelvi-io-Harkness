import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
// Relative import for Edge bundle (avoid `@/` in this file).
import { updateSession } from "./lib/supabase/middleware";

/** Next.js 16+: `middleware` was renamed to `proxy` (Edge entry before routes). */
export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    // Legacy URLs: `/app` was removed in favor of `/login` + `/family/*`.
    if (pathname === "/app") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/app/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/app/, "/family");
      return NextResponse.redirect(url);
    }

    return await updateSession(request);
  } catch (e) {
    console.error("[proxy] unhandled error:", e);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
