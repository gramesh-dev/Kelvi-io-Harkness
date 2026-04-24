import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentPlatformAdmin } from "@/lib/auth/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InviteExportRow = {
  email: string;
  status: "pending" | "accepted" | "revoked";
  allowed_roles: string[] | null;
  invited_at: string;
  accepted_at: string | null;
  last_login_at: string | null;
  login_count: number;
  note: string | null;
};

function csvEscape(value: unknown): string {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await getCurrentPlatformAdmin({
    request,
    debugRoute: "/admin/invites-export",
  });
  if (!auth.ok) {
    const message =
      auth.message ??
      (auth.code === "not-platform-admin" ? "Forbidden." : "Not authenticated.");
    return NextResponse.json(
      {
        ok: false as const,
        code: auth.code,
        message,
        ...(auth.debug ? { debug: auth.debug } : {}),
      },
      { status: auth.status }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { ok: false as const, code: "config", message: "Service role key is not configured." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status");

  const admin = createServiceClient();
  let query = admin
    .from("beta_access_invites")
    .select("email,status,allowed_roles,invited_at,accepted_at,last_login_at,login_count,note")
    .order("invited_at", { ascending: false });

  if (q) {
    query = query.ilike("email", `%${q}%`);
  }
  if (status && ["pending", "accepted", "revoked"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data } = await query.limit(5000);
  const rows = (data ?? []) as InviteExportRow[];

  const header = [
    "email",
    "status",
    "allowed_roles",
    "invited_at",
    "accepted_at",
    "last_login_at",
    "login_count",
    "note",
  ];
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvEscape(row.email),
        csvEscape(row.status),
        csvEscape((row.allowed_roles ?? []).join("|")),
        csvEscape(row.invited_at),
        csvEscape(row.accepted_at ?? ""),
        csvEscape(row.last_login_at ?? ""),
        csvEscape(row.login_count),
        csvEscape(row.note ?? ""),
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="beta-invites.csv"`,
      "cache-control": "no-store",
    },
  });
}
