import { getCompany } from "@/actions/settings/getCompany";
import { authOptions } from "@/authOptions";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import {
  batchUserPermissions,
  hasCollaborationPermission,
} from "@/lib/collaboration/batchUserPermissions";
import { getFilteredConnectedCompanies } from "@/lib/collaboration/getFilteredConnectedCompanies";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Collaboration from "./Collaboration";

export const metadata: Metadata = {
  title: "Communication Hub - Collaboration",
  description: "Manage client and supplier collaboration",
};

export default async function CollaborationPage() {
  const session = await getServerSession(authOptions);
  const userCompanyId = session?.user?.companyId;

  const company = await getCompany();
  if (!userCompanyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const [finalCompanies, companyWithAdmin, messages] = await Promise.all([
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
    db.collaborationMessage.findMany({
      where: {
        OR: [{ fromCompanyId: userCompanyId }, { toCompanyId: userCompanyId }],
      },
      include: { attachment: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const permissionsByUserId = await batchUserPermissions(
    companyWithAdmin.flatMap((c) => c.users),
  );
  const connectedIds = new Set(finalCompanies.map((c) => c.id));

  const filteredCompanyWithAdmin = companyWithAdmin.flatMap((company) => {
    const matchingJoin =
      company.companyJoinsAsOne.find(
        (j) =>
          (j.companyOneId === company.id && j.companyTwoId === userCompanyId) ||
          (j.companyOneId === userCompanyId && j.companyTwoId === company.id),
      ) ??
      company.companyJoinsAsTwo.find(
        (j) =>
          (j.companyOneId === company.id && j.companyTwoId === userCompanyId) ||
          (j.companyOneId === userCompanyId && j.companyTwoId === company.id),
      );

    const joinStatus = matchingJoin?.status ?? null;

    return company.users
      .filter((u) => hasCollaborationPermission(permissionsByUserId.get(u.id)))
      .map((user) => ({
        ...user,
        companyName: company.name,
        isConnected: connectedIds.has(user.companyId),
        companyStatus: joinStatus?.toLocaleLowerCase(),
      }));
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
