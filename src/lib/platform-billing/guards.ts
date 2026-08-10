import { authOptions } from "@/authOptions";
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
