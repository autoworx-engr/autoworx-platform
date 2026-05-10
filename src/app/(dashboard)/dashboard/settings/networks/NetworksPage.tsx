"use client";
import { connectWithCompany } from "@/actions/settings/myNetwork";
import { errorToast, successToast } from "@/lib/toast";
import { Company } from "@prisma/client";
import { useState } from "react";
import { CollaborationsSection } from "./CollaborationsSection";
import { NetworkSettingsPanel } from "./NetworkSettingsPanel";

type Props = {
  connectedCompanies: Company[];
  unconnectedCompanies: Company[];
  currentCompany: Company | null;
  collaborationDates: Date[];
  pendingSent: { company: Company; createdAt: Date; joinId: number }[];
  pendingReceived: { company: Company; createdAt: Date; joinId: number }[];
  rejectSent: { company: Company; createdAt: Date; joinId: number }[];
  rejectReceived: { company: Company; createdAt: Date; joinId: number }[];
  active: { company: Company; joinedAt: Date; joinId: number }[];
};

const NetworksPage = ({
  connectedCompanies: connectedCompaniesData = [],
  pendingSent,
  pendingReceived,
  active,
  rejectReceived,
  rejectSent,
  unconnectedCompanies,
  currentCompany,
}: Props) => {
  const [connectedCompanies, setConnectedCompanies] = useState<any[]>(
    connectedCompaniesData,
  );

  const handleConnectWithCompany = async (
    companyId: number,
    companyName: string,
  ) => {
    const result = await connectWithCompany({ targetCompanyId: companyId });
    if (result.success) {
      setConnectedCompanies((prev) => [
        ...prev,
        ...unconnectedCompanies.filter((c) => c.id === companyId),
      ]);
      successToast(`Connected with ${companyName}`);
    } else {
      errorToast(`Failed to connect with ${companyName}`);
    }
  };

  return (
    <div className="min-h-full w-full">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <CollaborationsSection
          active={active}
          pendingSent={pendingSent}
          pendingReceived={pendingReceived}
          rejectSent={rejectSent}
          rejectReceived={rejectReceived}
          currentCompanyId={Number(currentCompany?.id)}
        />
        <NetworkSettingsPanel
          unconnectedCompanies={unconnectedCompanies}
          onConnect={handleConnectWithCompany}
          initialSettings={{
            businessVisibility: !!currentCompany?.businessVisibility,
            phoneVisibility: !!currentCompany?.phoneVisibility,
            addressVisibility: !!currentCompany?.addressVisibility,
            latitude: currentCompany?.companyLatitude ?? null,
            longitude: currentCompany?.companyLongitude ?? null,
          }}
        />
      </div>
    </div>
  );
};

export default NetworksPage;
