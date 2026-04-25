"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function acceptRosterInviteAction(token: string) {
  const trimmed = token?.trim();
  if (!trimmed) {
    return { error: "Invalid link." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in first, using the same email the teacher entered." };
  }

  const { data, error } = await supabase.rpc("accept_classroom_roster_invite", {
    p_token: trimmed,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/family");
  revalidatePath("/post-login");
  return { ok: true as const, studentId: data as string };
}
