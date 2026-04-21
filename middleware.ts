import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
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
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
