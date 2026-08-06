import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards the whole Fleet directory subtree, including /dashboard/fleet/[id].
 */
export default async function FleetDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/fleet");

  return <>{children}</>;
}
