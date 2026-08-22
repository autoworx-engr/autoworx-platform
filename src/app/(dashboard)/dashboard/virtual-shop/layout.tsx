import { requireRouteAccess } from "@/lib/serverRouteGuard";

export const dynamic = "force-dynamic";

/**
 * Guards the whole Virtual Shop subtree — /admin, /admin/[shopId]/(tabs)/**,
 * /admin/service/create. Same `virtualShop` module as the configure screens
 * under settings, so one toggle turns the feature off everywhere.
 */
export default async function VirtualShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRouteAccess("/dashboard/virtual-shop");

  return <>{children}</>;
}
