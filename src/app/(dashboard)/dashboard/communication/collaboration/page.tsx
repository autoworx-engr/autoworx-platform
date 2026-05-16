import { getCompany } from "@/actions/settings/getCompany";
import { getUserPermissions } from "@/actions/settings/teamManagement";
import { authOptions } from "@/authOptions";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { Prisma } from "@prisma/client";
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

  const [finalCompanies, companyWithAdmin] = await Promise.all([
    getFilteredConnectedCompanies(userCompanyId),
    db.company.findMany({
      where: { NOT: { id: userCompanyId }, isCollaborators: true },
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
          select: { status: true, companyOneId: true, companyTwoId: true },
        },
        companyJoinsAsTwo: {
          where: {
            OR: [
              { companyOneId: userCompanyId },
              { companyTwoId: userCompanyId },
            ],
          },
          select: { status: true, companyOneId: true, companyTwoId: true },
        },
      },
    }),
  ]);

  const filteredCompanyWithAdmin = (
    await Promise.all(
      companyWithAdmin.map(async (company) => {
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
            } catch {
              return null;
            }
          }),
        );
        return filteredAdmins.filter((u) => u !== null);
      }),
    )
  ).flat();

  const messages = await db.collaborationMessage.findMany({
    where: {
      OR: [{ fromCompanyId: userCompanyId }, { toCompanyId: userCompanyId }],
    },
    include: { attachment: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

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
