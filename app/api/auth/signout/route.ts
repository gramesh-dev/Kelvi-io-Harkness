import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const supabase = await createClient();
  await supabase.auth.signOut();
  const base = url.origin;
  const fallback = "/login";
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
  return NextResponse.redirect(new URL(safeNext, base));
}
