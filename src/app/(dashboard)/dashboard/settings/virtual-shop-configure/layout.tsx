import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/** Guards /dashboard/settings/virtual-shop-configure and its /shops/** pages. */
export default async function VirtualShopConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/settings/virtual-shop-configure");

  return <>{children}</>;
}
