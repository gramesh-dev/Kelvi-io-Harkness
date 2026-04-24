import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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

/**
 * Authenticate the admin via Bearer token sent from the server-rendered page.
 * The admin page (server component) reads the access token from the session
 * cookie and passes it to AdminActionForm as a prop, which forwards it here
 * as Authorization: Bearer <token>. We validate it with the service client.
 */
async function getAdminUser(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const sbCookieNames = allCookies.filter(c => c.name.startsWith("sb-")).map(c => c.name);

  const debug = {
    routeName: "/api/admin/actions",
    hasCookieHeader: Boolean(request.headers.get("cookie")),
    hasBearerToken: false,
    supabaseCookieNames: sbCookieNames,
    getUserUserId: null as string | null,
    getUserEmail: null as string | null,
    getUserError: null as string | null,
    isAdminCheck: null as boolean | null,
    isAdminError: null as string | null,
  };

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  debug.hasBearerToken = Boolean(token);

  if (!token) {
    console.log("[api/admin/actions] no Bearer token", debug);
    return { user: null, serviceClient: null, error: "unauthenticated" as const, debug };
  }

  const serviceClient = createServiceClient();

  try {
    const { data, error } = await serviceClient.auth.getUser(token);
    debug.getUserUserId = data?.user?.id ?? null;
    debug.getUserEmail = data?.user?.email ?? null;
    debug.getUserError = error?.message ?? null;
  } catch (e) {
    debug.getUserError = String(e);
  }

  console.log("[api/admin/actions] getAdminUser", debug);

  if (!debug.getUserUserId) {
    return { user: null, serviceClient: null, error: "unauthenticated" as const, debug };
  }

  try {
    const ok = await isPlatformAdmin(serviceClient, debug.getUserUserId, debug.getUserEmail ?? null);
    debug.isAdminCheck = ok;
    if (!ok) {
      return { user: null, serviceClient: null, error: "forbidden" as const, debug };
    }
  } catch (e) {
    debug.isAdminError = String(e);
    return { user: null, serviceClient: null, error: "forbidden" as const, debug };
  }

  return {
    user: { id: debug.getUserUserId, email: debug.getUserEmail },
    serviceClient,
    error: null,
    debug,
  };
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

  const { user, serviceClient, error: authError, debug } = await getAdminUser(request);
  if (authError === "unauthenticated") {
    return NextResponse.json(
      { ok: false, notice: "not-authenticated", error: "Not authenticated", debug },
      { status: 401 }
    );
  }
  if (authError === "forbidden" || !user || !serviceClient) {
    return NextResponse.json(
      { ok: false, notice: "not-authenticated", error: "Not an admin", debug },
      { status: 403 }
    );
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
