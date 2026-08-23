import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/** Guards /dashboard/settings/automation — `automation` module only. */
export default async function AutomationSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/settings/automation");

  return <>{children}</>;
}
