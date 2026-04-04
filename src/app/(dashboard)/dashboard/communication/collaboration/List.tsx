import React, { useState } from "react";
import Image from "next/image";
import { Company, User } from "@prisma/client";
import { cn } from "@/lib/cn";
import CollaborationToggle from "./CollaborationToggle";
import { useRouter, useSearchParams } from "next/navigation";
import { getCompanyUnreadCounts } from "@/actions/communication/collaboration/getCompanyUnreadCounts";
import { useCompanyUnreadCounts } from "./hooks/useCompanyUnreadCounts";
import CompanyListItem from "./CompanyListItem";

type TProps = {
  companies: (Company & { users: User[] })[];
  selectedCompany: Company | null;
  companyAdmins: any;
  setCompanyAdmins: React.Dispatch<React.SetStateAction<Partial<User>[]>>;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  isCollaborators: boolean | null | undefined;
  companyId: number;
};

export default function List({
  companies,
  selectedCompany,
  setSelectedCompany,
  isCollaborators,
  companyAdmins,
  setCompanyAdmins,
  companyId,
}: TProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const searchParams = useSearchParams();

  const handleSelectCompany = (company: Company & { users: User[] }) => {
    const params = new URLSearchParams(searchParams);

    params.set("companyId", company.id.toString());

    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="app-shadow h-screen w-full overflow-y-auto rounded-lg bg-background p-3 sm:block sm:h-[83vh] sm:w-[30%]">
      <CollaborationToggle
        companyId={companyId}
        initialValue={isCollaborators ?? false}
        companies={companies}
        setCompanyAdmins={setCompanyAdmins}
        companyAdmins={companyAdmins}
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search company"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="my-3 w-full rounded-md border-2 border-[#006D77] p-2"
      />

      <div className="flex flex-col gap-2">
        {companies
          .filter((company) =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((company) => (
            <CompanyListItem
              key={company.id}
              company={company}
              currentCompanyId={companyId}
              selectedCompanyId={selectedCompany?.id ?? null}
              onSelect={() => handleSelectCompany(company)}
            />
          ))}
      </div>
    </div>
  );
}
