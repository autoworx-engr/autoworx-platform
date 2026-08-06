import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards the whole Employee directory subtree, including /dashboard/employee/[id].
 */
export default async function EmployeeDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/employee");

  return <>{children}</>;
}
