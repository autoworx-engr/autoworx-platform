import { getUserPermissions } from "@/actions/settings/teamManagement";
import { db } from "@/lib/db";

/**
 * Returns companies connected (ACCEPTED) to the given company that have at
 * least one user with the communicationHubCollaboration permission.
 *
 * Extracted from 5 identical copy-pasted blocks across the collaboration routes
 * and the dashboard page.
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

  const filtered = await Promise.all(
    oppositeCompanies.map(async (company) => {
      const users = await Promise.all(
        company.users.map(async (user) => {
          try {
            const permissions = await getUserPermissions(
              user.id,
              user.employeeType,
            );
            return permissions?.communicationHubCollaboration === true
              ? user
              : null;
          } catch {
            return null;
          }
        }),
      );
      return { ...company, users: users.filter((u) => u !== null) };
    }),
  );

  return filtered.filter((c) => c.users.length > 0);
}
