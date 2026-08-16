import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Use Product is Admin / Manager only, and still needs the Inventory module —
 * Sales, Technician and Other are refused regardless of their Inventory
 * permission (see ROLE_RESTRICTED_ROUTE_PREFIXES).
 */
export default async function UseProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/inventory/use");

  return <>{children}</>;
}
