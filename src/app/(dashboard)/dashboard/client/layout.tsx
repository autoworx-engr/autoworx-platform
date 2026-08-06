import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards the whole Client directory subtree, including /dashboard/client/[clientId].
 */
export default async function ClientDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/client");

  return <>{children}</>;
}
