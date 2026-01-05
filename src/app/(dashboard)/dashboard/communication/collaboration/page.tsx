import { authOptions } from "@/authOptions";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Collaboration from "./Collaboration";
import { getCompany } from "@/actions/settings/getCompany";

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

  const messages = await db.message.findMany({
    where: {
      OR: [
        {
          from: parseInt(session?.user?.id),
        },
        {
          to: parseInt(session?.user?.id),
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
          firstName: true,
          lastName: true,
          companyId: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  const filteredCompanyWithAdmin = companyWithAdmin
    .map((company) => {
      return company.users.map((user) => {
        return {
          ...user,
          companyName: company.name,
          isConnected: oppositeCompanies.some((c) => c.id === user.companyId),
        };
      });
    })
    .flat();

  return (
    <div>
      <Title className="hidden sm:block">
        Communication Hub - Collaboration
      </Title>
      <Collaboration
        companyWithAdmin={filteredCompanyWithAdmin}
        companies={oppositeCompanies}
        currentUser={session?.user}
        messages={messages}
        isCollaborators={company?.isCollaborators}
      />
    </div>
  );
}
