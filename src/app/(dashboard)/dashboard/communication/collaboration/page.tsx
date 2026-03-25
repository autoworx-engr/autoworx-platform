import { getCompany } from "@/actions/settings/getCompany";
import { getUserPermissions } from "@/actions/settings/teamManagement";
import { authOptions } from "@/authOptions";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Collaboration from "./Collaboration";

export const metadata: Metadata = {
  title: "Communication Hub - Collaboration",
};

export default async function CollaborationPage() {
  const session = await getServerSession(authOptions);
  const userCompanyId = session?.user?.companyId;

  const company = await getCompany();
  if (!userCompanyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const connectedCompanies = await db.companyJoin.findMany({
    where: {
      OR: [
        {
          companyOneId: userCompanyId,
          companyTwo: {
            isCollaborators: true,
          },
        },
        {
          companyTwoId: userCompanyId,
          companyOne: {
            isCollaborators: true,
          },
        },
      ],
      status: "ACCEPTED",
    },
    include: {
      companyOne: {
        include: {
          users: {
            where: {
              employeeType: {
                in: ["Admin", "Manager", "Sales"],
              },
            },
          },
        },
      },
      companyTwo: {
        include: {
          users: {
            where: {
              employeeType: {
                in: ["Admin", "Manager", "Sales"],
              },
            },
          },
        },
      },
    },
  });

  const oppositeCompanies = connectedCompanies.map((join) => {
    if (join.companyOneId === userCompanyId) {
      return join.companyTwo;
    } else {
      return join.companyOne;
    }
  });
  // Filter users in oppositeCompanies based on their collaboration permissions
  const filteredOppositeCompanies = await Promise.all(
    oppositeCompanies.map(async (company) => {
      // Filter users who have collaboration permission
      const filteredUsers = await Promise.all(
        company.users.map(async (user) => {
          try {
            const permissions = await getUserPermissions(
              user.id,
              user.employeeType,
            );

            // Check communicationHubCollaboration permission
            const hasCollaboration =
              permissions?.communicationHubCollaboration === true;

            return hasCollaboration ? user : null;
          } catch (error) {
            console.error(`  ERROR for user ${user.firstName}:`, error);
            return null;
          }
        }),
      );

      const filtered = filteredUsers.filter((user) => user !== null);

      return {
        ...company,
        users: filtered,
      };
    }),
  );

  // Remove companies that have no users with collaboration permission
  const finalCompanies = filteredOppositeCompanies.filter(
    (company) => company.users.length > 0,
  );

  const messages = await db.collaborationMessage.findMany({
    where: {
      OR: [
        {
          fromCompanyId: parseInt(session?.user?.id),
        },
        {
          toCompanyId: parseInt(session?.user?.id),
        },
      ],
    },
    include: {
      attachment: true,
    },
  });

  const companyWithAdmin = await db.company.findMany({
    where: {
      NOT: { id: userCompanyId },
      isCollaborators: true,
    },
    select: {
      id: true,
      name: true,
      users: {
        where: { employeeType: "Admin" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyId: true,
          email: true,
          role: true,
          image: true,
          employeeType: true,
        },
      },
      companyJoinsAsOne: {
        where: {
          OR: [
            { companyOneId: userCompanyId },
            { companyTwoId: userCompanyId },
          ],
        },
        select: {
          status: true,
          companyOneId: true,
          companyTwoId: true,
        },
      },
      companyJoinsAsTwo: {
        where: {
          OR: [
            { companyOneId: userCompanyId },
            { companyTwoId: userCompanyId },
          ],
        },
        select: {
          status: true,
          companyOneId: true,
          companyTwoId: true,
        },
      },
    },
  });

  // Filter admins based on collaboration permission
  const filteredCompanyWithAdminPromises = companyWithAdmin.map(
    async (company) => {
      const filteredAdmins = await Promise.all(
        company.users.map(async (user) => {
          const joinAsOne = company.companyJoinsAsOne.find(
            (j) =>
              (j.companyOneId === company.id &&
                j.companyTwoId === userCompanyId) ||
              (j.companyOneId === userCompanyId &&
                j.companyTwoId === company.id),
          );

          const joinAsTwo = company.companyJoinsAsTwo.find(
            (j) =>
              (j.companyOneId === company.id &&
                j.companyTwoId === userCompanyId) ||
              (j.companyOneId === userCompanyId &&
                j.companyTwoId === company.id),
          );

          const joinStatus = joinAsOne?.status ?? joinAsTwo?.status ?? null;
          try {
            const permissions = await getUserPermissions(
              user.id,
              user.employeeType,
            );

            // Check communicationHubCollaboration permission
            const hasCollaboration =
              permissions?.communicationHubCollaboration === true;

            return hasCollaboration
              ? {
                  ...user,
                  companyName: company.name,
                  isConnected: finalCompanies.some(
                    (c) => c.id === user.companyId,
                  ),
                  companyStatus: joinStatus?.toLocaleLowerCase(),
                }
              : null;
          } catch (error) {
            console.error(
              `    ERROR checking permissions for admin ${user.id}:`,
              error,
            );
            return null;
          }
        }),
      );
      return filteredAdmins.filter((user) => user !== null);
    },
  );

  const filteredCompanyWithAdmin = (
    await Promise.all(filteredCompanyWithAdminPromises)
  ).flat();

  return (
    <div>
      <Title className="hidden sm:block">
        Communication Hub - Collaboration
      </Title>
      <Collaboration
        companyWithAdmin={filteredCompanyWithAdmin}
        companies={finalCompanies}
        currentUser={session?.user}
        messages={messages}
        isCollaborators={company?.isCollaborators}
      />
    </div>
  );
}
