import { db } from "@/lib/db";
import {
  batchUserPermissions,
  hasCollaborationPermission,
} from "@/lib/collaboration/batchUserPermissions";

/**
 * Returns companies connected (ACCEPTED) to the given company that have at
 * least one user with the communicationHubCollaboration permission.
 *
 * Permissions are batched into a single Map (one lookup per unique user)
 * instead of N+1 lookups inside nested loops.
 */
export async function getFilteredConnectedCompanies(companyId: number) {
  const joins = await db.companyJoin.findMany({
    where: {
      OR: [
        { companyOneId: companyId, companyTwo: { isCollaborators: true } },
        { companyTwoId: companyId, companyOne: { isCollaborators: true } },
      ],
      status: "ACCEPTED",
    },
    include: {
      companyOne: {
        include: {
          users: {
            where: { employeeType: { in: ["Admin", "Manager", "Sales"] } },
          },
        },
      },
      companyTwo: {
        include: {
          users: {
            where: { employeeType: { in: ["Admin", "Manager", "Sales"] } },
          },
        },
      },
    },
  });

  const oppositeCompanies = joins.map((join) =>
    join.companyOneId === companyId ? join.companyTwo : join.companyOne,
  );

  const allUsers = oppositeCompanies.flatMap((c) => c.users);
  const permissionsByUserId = await batchUserPermissions(allUsers);

  const filtered = oppositeCompanies.map((company) => ({
    ...company,
    users: company.users.filter((u) =>
      hasCollaborationPermission(permissionsByUserId.get(u.id)),
    ),
  }));

  return filtered.filter((c) => c.users.length > 0);
}
