import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { db } from "./db";
import getPermissions from "./getPermissions";
import { canAccessRoute, canAccessWithFeatureKey } from "./routeAccess";
import { resolveRouteFeatureKey } from "./routeFeatureKeys";

/**
 * Server-side counterpart to `PrivateRoute`.
 *
 * `PrivateRoute` only redirects in the browser, so a direct URL hit still
 * renders the page (and runs its data fetching) before the client bails out.
 * Call this from a subtree `layout.tsx` to refuse the request on the server:
 *
 *     await requireRouteAccess("/dashboard/employee");
 *
 * Pass the subtree root, not the concrete URL — the route → key maps resolve
 * child pages through their prefix, so one call covers /dashboard/employee,
 * /dashboard/employee/89983 and anything else below it.
 */
export async function requireRouteAccess(route: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const permissions = await getPermissions();
  if (!canAccessRoute(route, permissions)) notFound();

  const featureKey = resolveRouteFeatureKey(route);
  if (!featureKey) return;

  const companyId = Number(session.user.companyId);
  if (!companyId) return;

  const companyFeaturePermission = await db.companyPermissionModule.findMany({
    where: { companyId },
    select: { permission_name: true, enabled: true },
  });

  if (!canAccessWithFeatureKey(featureKey, companyFeaturePermission)) {
    notFound();
  }
}
