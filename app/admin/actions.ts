"use server";

import { runAdminMutation, type AdminMutationResult } from "@/lib/admin/run-admin-mutation";
import type { AdminMutationAction } from "@/lib/auth/admin-mutations";

export async function executeAdminMutation(input: {
  action: AdminMutationAction;
  payload: Record<string, unknown>;
}): Promise<AdminMutationResult> {
  return runAdminMutation(input);
}
