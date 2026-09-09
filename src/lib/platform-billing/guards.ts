import { authOptions } from "@/authOptions";
import getPermissions from "@/lib/getPermissions";
import { canAccessRoute } from "@/lib/routeAccess";
import { getServerSession } from "next-auth";

export async function requireBillingSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function assertCompanyAccess(
  session: { user: { companyId: number; isSuperAdmin: boolean } },
  companyId: number,
) {
  if (!session.user.isSuperAdmin && session.user.companyId !== companyId) {
    throw new Error("Forbidden");
  }
}

export function assertSuperAdmin(session: { user: { isSuperAdmin: boolean } }) {
  if (!session.user.isSuperAdmin) {
    throw new Error("Forbidden");
  }
}

const BILLING_ROUTE = "/dashboard/settings/billing";

/**
 * assertCompanyAccess only proves the caller belongs to the company, so
 * without this any authenticated employee could change the plan (an immediate
 * prorated charge), cancel the subscription, or open the Stripe Portal by
 * invoking the action directly. Resolved through the same route -> permission
 * map the sidebar and route guard use (/dashboard/settings -> businessSettings)
 * rather than a hardcoded role list, so granting or revoking Business Settings
 * moves billing access with it.
 */
export async function assertBillingAccess() {
  if (!canAccessRoute(BILLING_ROUTE, await getPermissions())) {
    throw new Error("Forbidden");
  }
}
