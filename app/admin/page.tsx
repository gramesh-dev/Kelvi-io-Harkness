import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BETA_ALLOWED_ROLES,
  isPlatformAdmin,
  type BetaAllowedRole,
} from "@/lib/auth/invite-only";
import {
  sendBetaInviteAction,
  resendBetaInviteAction,
  updateBetaInviteStatusAction,
} from "@/app/admin/actions";

type InviteRow = {
  email: string;
  status: "pending" | "accepted" | "revoked";
  allowed_roles: BetaAllowedRole[] | null;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  last_login_at: string | null;
  login_count: number;
  note: string | null;
};

type SearchParams = Promise<{ notice?: string; q?: string; status?: string }>;

const noticeText: Record<string, string> = {
  "invite-sent": "Invite email sent successfully.",
  "invite-updated": "Invite status updated.",
  "invalid-email": "Please enter a valid email address.",
  "invite-save-failed": "Could not save invite. Try again.",
  "invite-email-failed": "Invite saved, but email sending failed.",
  "invite-update-failed": "Could not update invite status.",
  "invite-resent": "Invite email re-sent.",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function fmtRelative(value: string | null): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default async function AdminPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = await isPlatformAdmin(supabase, user.id, user.email ?? null);
  if (!allowed) {
    redirect("/post-login");
  }

  const queryText = (sp.q ?? "").trim();
  const queryStatus = ["pending", "accepted", "revoked"].includes(String(sp.status ?? ""))
    ? String(sp.status)
    : "all";

  const admin = createServiceClient();
  let invitesQuery = admin
    .from("beta_access_invites")
    .select(
      "email,status,allowed_roles,invited_by,invited_at,accepted_at,last_login_at,login_count,note"
    )
    .order("invited_at", { ascending: false });

  if (queryText) {
    invitesQuery = invitesQuery.ilike("email", `%${queryText}%`);
  }
  if (queryStatus !== "all") {
    invitesQuery = invitesQuery.eq("status", queryStatus);
  }

  const { data: invitesData } = await invitesQuery.limit(200);

  const invites = (invitesData ?? []) as InviteRow[];
  const inviterIds = Array.from(new Set(invites.map((x) => x.invited_by).filter(Boolean))) as string[];
  const inviterById = new Map<string, string>();

  if (inviterIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,full_name,email")
      .in("id", inviterIds);
    for (const p of profiles ?? []) {
      inviterById.set(p.id as string, String((p.full_name as string) || (p.email as string) || p.id));
    }
  }

  const loginByEmail = new Map<string, string>();
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  for (const u of usersPage?.users ?? []) {
    if (!u.email) continue;
    loginByEmail.set(u.email.toLowerCase(), u.last_sign_in_at ?? "");
  }

  const notice = sp.notice ? noticeText[sp.notice] : "";

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-6 py-8 sm:px-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-kelvi-teal">Admin</p>
            <h1 className="font-serif text-4xl text-kelvi-school-ink">Invite-only control panel</h1>
            <p className="text-kelvi-school-ink/75">
              Manage tester invites and monitor who has logged into this environment.
            </p>
          </div>
          <Link
            href="/api/auth/signout?next=/login"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-kelvi-school-ink hover:bg-kelvi-school-surface"
          >
            Log out
          </Link>
        </div>
      </header>

      {notice ? (
        <div className="rounded-lg border border-kelvi-teal/30 bg-kelvi-teal/10 px-4 py-3 text-sm text-kelvi-school-ink">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-2xl font-semibold text-kelvi-school-ink">Send invite</h2>
        <form action={sendBetaInviteAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-kelvi-school-ink">Tester email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="tester@example.com"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-kelvi-teal"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-kelvi-school-ink">Note (optional)</span>
            <input
              name="note"
              type="text"
              placeholder="Pilot batch A"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-kelvi-teal"
            />
          </label>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-kelvi-school-ink">Allowed roles</p>
            <div className="flex flex-wrap gap-4">
              {BETA_ALLOWED_ROLES.map((role) => (
                <label key={role} className="inline-flex items-center gap-2 text-sm text-kelvi-school-ink">
                  <input type="checkbox" name="roles" value={role} defaultChecked />
                  <span className="capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-kelvi-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-kelvi-teal-hover"
            >
              Send invite email
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-kelvi-school-ink">Invites and logins</h2>
          <span className="text-sm text-kelvi-school-ink/60">{invites.length} total</span>
        </div>
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            name="q"
            defaultValue={queryText}
            placeholder="Search by email"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-kelvi-teal"
          />
          <select
            name="status"
            defaultValue={queryStatus}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-kelvi-teal"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="revoked">Revoked</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-kelvi-school-ink hover:bg-kelvi-school-surface"
            >
              Apply
            </button>
            <Link
              href={`/admin/invites-export${queryText || queryStatus !== "all" ? `?${new URLSearchParams({
                ...(queryText ? { q: queryText } : {}),
                ...(queryStatus !== "all" ? { status: queryStatus } : {}),
              }).toString()}` : ""}`}
              className="rounded-lg border border-kelvi-teal/30 px-3 py-2 text-sm font-medium text-kelvi-teal hover:bg-kelvi-teal/10"
            >
              Export CSV
            </Link>
          </div>
        </form>
        {invites.length === 0 ? (
          <p className="text-sm text-kelvi-school-ink/70">No invites yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-kelvi-school-ink/70">
                <tr>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Roles</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Invited</th>
                  <th className="py-2 pr-4 font-medium">Accepted</th>
                  <th className="py-2 pr-4 font-medium">Last login</th>
                  <th className="py-2 pr-4 font-medium">Last seen</th>
                  <th className="py-2 pr-4 font-medium">Count</th>
                  <th className="py-2 pr-4 font-medium">Invited by</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.email} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-kelvi-school-ink">{inv.email}</p>
                      {inv.note ? <p className="text-xs text-kelvi-school-ink/60">{inv.note}</p> : null}
                    </td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/75">
                      {(inv.allowed_roles ?? []).join(", ") || "all"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-kelvi-school-surface px-2 py-0.5 text-xs font-medium capitalize text-kelvi-school-ink">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">{fmtDate(inv.invited_at)}</td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">{fmtDate(inv.accepted_at)}</td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">
                      {fmtDate(inv.last_login_at ?? loginByEmail.get(inv.email.toLowerCase()) ?? null)}
                    </td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">
                      {fmtRelative(inv.last_login_at ?? loginByEmail.get(inv.email.toLowerCase()) ?? null)}
                    </td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">{inv.login_count}</td>
                    <td className="py-3 pr-4 text-kelvi-school-ink/70">
                      {inv.invited_by ? inviterById.get(inv.invited_by) ?? inv.invited_by : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <form action={resendBetaInviteAction}>
                          <input type="hidden" name="email" value={inv.email} />
                          <button
                            type="submit"
                            className="rounded-md border border-kelvi-teal/30 px-2 py-1 text-xs font-medium text-kelvi-teal hover:bg-kelvi-teal/10"
                          >
                            Resend
                          </button>
                        </form>
                        {inv.status !== "revoked" ? (
                          <form action={updateBetaInviteStatusAction}>
                            <input type="hidden" name="email" value={inv.email} />
                            <input type="hidden" name="status" value="revoked" />
                            <button
                              type="submit"
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Revoke
                            </button>
                          </form>
                        ) : (
                          <form action={updateBetaInviteStatusAction}>
                            <input type="hidden" name="email" value={inv.email} />
                            <input type="hidden" name="status" value="pending" />
                            <button
                              type="submit"
                              className="rounded-md border border-kelvi-teal/30 px-2 py-1 text-xs font-medium text-kelvi-teal hover:bg-kelvi-teal/10"
                            >
                              Re-enable
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
