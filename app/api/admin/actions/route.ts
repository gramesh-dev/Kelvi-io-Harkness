import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabasePublicCredentialsOrPlaceholder } from "@/lib/supabase/public-env";
import {
  isPlatformAdmin,
  normalizeEmail,
  BETA_ALLOWED_ROLES,
  type BetaAllowedRole,
} from "@/lib/auth/invite-only";
import { revalidatePath } from "next/cache";

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function parseAllowedRoles(values: string[]): BetaAllowedRole[] {
  const chosen = values.filter((v): v is BetaAllowedRole =>
    (BETA_ALLOWED_ROLES as readonly string[]).includes(v)
  );
  return chosen.length > 0 ? chosen : [...BETA_ALLOWED_ROLES];
}

function mapWaitlistRoleToAllowedRoles(roleRequested: string): BetaAllowedRole[] {
  if (roleRequested === "family") return ["family"];
  if (roleRequested === "school") return ["school"];
  if (roleRequested === "individual") return ["individual"];
  return [...BETA_ALLOWED_ROLES];
}

async function getAdminUser(request: NextRequest) {
  // Read cookies directly from request.cookies (not cookies() from next/headers).
  // Confirmed pattern: GET /api/debug-cookies with request.cookies.getAll() returned
  // the session and getUser() succeeded. POST route handlers behave the same way for
  // request.cookies, but cookies() from next/headers is unreliable for POST on Vercel.
  const creds = getSupabasePublicCredentialsOrPlaceholder();
  const supabase = createServerClient(creds.url, creds.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {}, // auth check only — no need to update cookies here
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  console.log("[api/admin/actions] getAdminUser", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: error?.message ?? null,
    cookieCount: request.cookies.getAll().length,
    sbCookies: request.cookies.getAll().filter(c => c.name.startsWith("sb-")).map(c => c.name),
  });

  if (!user) return { user: null, serviceClient: null, error: "unauthenticated" as const };

  const ok = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  if (!ok) return { user: null, serviceClient: null, error: "forbidden" as const };

  const serviceRoleAvailable = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const serviceClient = serviceRoleAvailable ? createServiceClient() : supabase;
  return { user, serviceClient, error: null };
}

async function sendInviteEmail(serviceClient: ReturnType<typeof createServiceClient>, email: string) {
  return serviceClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${appBaseUrl()}/callback`,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const { user, serviceClient, error: authError } = await getAdminUser(request);
  if (authError === "unauthenticated") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (authError === "forbidden" || !user || !serviceClient) {
    return NextResponse.json({ error: "Not an admin" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();

  // ── sendInvite ────────────────────────────────────────────────────────────
  if (body.action === "sendInvite") {
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const requestId: string | null = body.request_id ?? null;
    const roleRequested = String(body.role_requested ?? "").trim().toLowerCase();
    const roleFromWaitlist = mapWaitlistRoleToAllowedRoles(roleRequested);
    const submittedRoles = parseAllowedRoles(Array.isArray(body.roles) ? body.roles : []);
    const allowedRoles =
      submittedRoles.length > 0
        ? submittedRoles
        : roleFromWaitlist.length > 0
          ? roleFromWaitlist
          : [...BETA_ALLOWED_ROLES];
    const note: string | null =
      String(body.note ?? "").trim() ||
      (requestId ? `Invited from waitlist (${roleRequested || "unspecified"})` : null);

    const { error: upsertError } = await serviceClient.from("beta_access_invites").upsert(
      { email, invited_by: user.id, status: "pending", invited_at: nowIso, note, allowed_roles: allowedRoles },
      { onConflict: "email" }
    );
    if (upsertError) {
      return NextResponse.json({ error: "Could not save invite" }, { status: 500 });
    }

    const { error: emailError } = await sendInviteEmail(serviceClient, email);
    if (emailError) {
      return NextResponse.json({ error: "Invite saved but email failed: " + emailError.message }, { status: 500 });
    }

    if (requestId) {
      await serviceClient.from("waitlist_requests").update({ status: "contacted" }).eq("id", requestId);
    }

    revalidatePath("/admin");
    return NextResponse.json({ ok: true, notice: requestId ? "waitlist-invited" : "invite-sent" });
  }

  // ── resendInvite ──────────────────────────────────────────────────────────
  if (body.action === "resendInvite") {
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { data: invite } = await serviceClient
      .from("beta_access_invites")
      .select("allowed_roles,note")
      .eq("email", email)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const { error: upsertError } = await serviceClient.from("beta_access_invites").upsert(
      { email, invited_by: user.id, status: "pending", invited_at: nowIso, note: invite.note, allowed_roles: invite.allowed_roles },
      { onConflict: "email" }
    );
    if (upsertError) {
      return NextResponse.json({ error: "Could not update invite" }, { status: 500 });
    }

    const { error: emailError } = await sendInviteEmail(serviceClient, email);
    if (emailError) {
      return NextResponse.json({ error: "Invite saved but email failed" }, { status: 500 });
    }

    revalidatePath("/admin");
    return NextResponse.json({ ok: true, notice: "invite-resent" });
  }

  // ── updateInviteStatus ────────────────────────────────────────────────────
  if (body.action === "updateInviteStatus") {
    const email = normalizeEmail(String(body.email ?? ""));
    const nextStatus = String(body.status ?? "").trim();
    if (!email || !["pending", "accepted", "revoked"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { error } = await serviceClient
      .from("beta_access_invites")
      .update({ status: nextStatus })
      .eq("email", email);

    if (error) {
      return NextResponse.json({ error: "Could not update status" }, { status: 500 });
    }

    revalidatePath("/admin");
    return NextResponse.json({ ok: true, notice: "invite-updated" });
  }

  // ── archiveRequest ────────────────────────────────────────────────────────
  if (body.action === "archiveRequest") {
    const requestId = String(body.request_id ?? "").trim();
    if (!requestId) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    const { error } = await serviceClient
      .from("waitlist_requests")
      .update({ status: "archived" })
      .eq("id", requestId);

    if (error) {
      return NextResponse.json({ error: "Could not archive request" }, { status: 500 });
    }

    revalidatePath("/admin");
    return NextResponse.json({ ok: true, notice: "waitlist-archived" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
