import { redirect } from "next/navigation";
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth";
import { RoleSetupWizard } from "./role-setup-wizard";

export default async function RoleSetupPage() {
  const next = await getPostAuthRedirectPath();
  if (next !== "/role-setup") {
    redirect(next);
  }

  return <RoleSetupWizard />;
}
