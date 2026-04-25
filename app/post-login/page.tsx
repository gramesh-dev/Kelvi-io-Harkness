import { redirect } from "next/navigation";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";

/**
 * Single hop after session exists (email password or OAuth callback).
 * Computes dashboard vs role-setup from org memberships + profile metadata.
 */
export default async function PostLoginPage() {
  const path = await getPostAuthRedirectPath();
  redirect(path);
}
