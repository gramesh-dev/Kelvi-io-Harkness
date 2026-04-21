import { NextResponse } from "next/server";
import { deleteUserOwnedData } from "@/lib/account/delete-user-owned-data";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Deletes application data for the current user, then removes the auth user (service role).
 * Data cleanup runs via service-role queries (no RPC required in Supabase).
 */
export async function POST() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.length) {
      return NextResponse.json(
        {
          error:
            "Server is not configured for account deletion (SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const { error: dataErr } = await deleteUserOwnedData(admin, user.id);
    if (dataErr) {
      return NextResponse.json({ error: dataErr }, { status: 500 });
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
