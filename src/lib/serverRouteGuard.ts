import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { db } from "./db";
import getPermissions from "./getPermissions";
import { canAccessRoute, canAccessWithFeatureKey } from "./routeAccess";
import { resolveRouteFeatureKey } from "./routeFeatureKeys";

/**
 * Server-side equivalent of the `useCanAccessRoute` hook: runs the company
 * feature check and the user-permission check for a route without throwing.
 *
 * Use this in a server component that should degrade gracefully — e.g. a
 * dashboard widget that renders a "permission required" notice instead of its
 * data. Check it *before* fetching, so a user without access never triggers the
 * queries. For a whole page/subtree that should 404, use `requireRouteAccess`.
 */
export async function hasRouteAccess(route: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const permissions = await getPermissions();
  if (!canAccessRoute(route, permissions)) return false;

  const featureKey = resolveRouteFeatureKey(route);
  if (!featureKey) return true;

  const companyId = Number(session.user.companyId);
  if (!companyId) return true;

  const companyFeaturePermission = await db.companyPermissionModule.findMany({
    where: { companyId },
    select: { permission_name: true, enabled: true },
  });

  return canAccessWithFeatureKey(featureKey, companyFeaturePermission);
}

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

  if (!(await hasRouteAccess(route))) notFound();
}
