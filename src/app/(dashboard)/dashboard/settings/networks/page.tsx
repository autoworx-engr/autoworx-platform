import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import React from "react";
import NetworksPage from "./NetworksPage";
import { planObject } from "@/utils/planObject";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Networks",
  description: "Manage your networks",
};

type Props = {};

const page = async (props: Props) => {
  const userCompanyId = await getCompanyId();

  const currentCompany = await db.company.findUnique({
    where: {
      id: userCompanyId,
    },
  });

  const connectedCompanyIds = await db.companyJoin.findMany({
    where: {
      OR: [{ companyOneId: userCompanyId }, { companyTwoId: userCompanyId }],
    },
    include: {
      companyOne: true,
      companyTwo: true,
    },
  });

  const collaborationDates = connectedCompanyIds.map((join) => join.createdAt);

  const connectedIds = connectedCompanyIds.flatMap((join) =>
    [join.companyOneId, join.companyTwoId].filter((id) => id !== userCompanyId),
  );

  const connectedCompanies = await db.company.findMany({
    where: {
      id: {
        in: connectedIds,
      },
    },
    include: {
      companyJoinsAsOne: true,
      companyJoinsAsTwo: true,
    },
  });

  const unconnectedCompanies = await db.company.findMany({
    where: {
      id: {
        notIn: connectedIds,
        not: userCompanyId,
      },
    },
  });

  const pendingSent = [];
  const pendingReceived = [];
  const rejectSent = [];
  const rejectReceived = [];
  const active = [];

  for (const join of connectedCompanyIds) {
    const isSender = join.companyOneId === userCompanyId;
    const isReceiver = join.companyTwoId === userCompanyId;

    const otherCompany = isSender ? join.companyTwo : join.companyOne;

    if (join.status === "PENDING") {
      if (isSender) {
        pendingSent.push({
          company: otherCompany,
          joinId: join.id,
          createdAt: join.createdAt,
        });
      }

      if (isReceiver) {
        pendingReceived.push({
          company: otherCompany,
          joinId: join.id,
          createdAt: join.createdAt,
        });
      }
    }

    if (join.status === "REJECTED") {
      if (isSender) {
        rejectSent.push({
          company: otherCompany,
          joinId: join.id,
          createdAt: join.createdAt,
        });
      }

      if (isReceiver) {
        rejectReceived.push({
          company: otherCompany,
          joinId: join.id,
          createdAt: join.createdAt,
        });
      }
    }

    if (join.status === "ACCEPTED") {
      active.push({
        company: otherCompany,
        joinId: join.id,
        joinedAt: join.createdAt,
      });
    }
  }

  return (
    <NetworksPage
      connectedCompanies={connectedCompanies}
      collaborationDates={collaborationDates}
      unconnectedCompanies={unconnectedCompanies}
      currentCompany={currentCompany}
      active={active}
      pendingReceived={pendingReceived}
      pendingSent={pendingSent}
      rejectReceived={rejectReceived}
      rejectSent={rejectSent}
    />
  );
};

export default page;
