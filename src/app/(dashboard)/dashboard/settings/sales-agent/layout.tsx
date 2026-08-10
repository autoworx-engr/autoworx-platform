import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards /dashboard/settings/sales-agent and /ai-settings — `salesAgent`
 * module only. The company-entitlement side stays deliberately open here
 * (`isEntitlementGatedRoute`) so a company without the plan sees the upgrade
 * prompt on the page instead of a 404.
 */
export default async function SalesAgentSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/settings/sales-agent");

  return <>{children}</>;
}
