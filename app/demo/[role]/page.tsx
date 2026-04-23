import { notFound } from "next/navigation";
import { DemoRoleJourney } from "@/components/demo/demo-role-journey";
import { isDemoRole } from "@/lib/demo/experience";

export default async function DemoRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isDemoRole(role)) notFound();

  return <DemoRoleJourney role={role} />;
}
