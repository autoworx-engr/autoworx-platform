"use client";

import { cn } from "@/lib/cn";
import {
  Attachment,
  Company,
  Message as DbMessage,
  User,
} from "@prisma/client";
import { Session } from "next-auth";
import { useEffect, useState } from "react";
import List from "./List";
import UsersArea from "./UsersArea";
import { useUnreadCollaborationMessages } from "./hooks/useUnreadCollaborationMessages";
import CompanyArea from "./CompanyArea";
import { useParams, useSearchParams } from "next/navigation";

export default function Collaboration({
  companyWithAdmin,
  companies,
  currentUser,
  messages,
  isCollaborators,
}: {
  companyWithAdmin: Partial<User>[];
  companies: (Company & { users: User[] })[];
  currentUser: Session["user"];
  messages: (DbMessage & { attachment: Attachment[] | null })[];
  isCollaborators: boolean | null | undefined;
}) {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState(companyWithAdmin);

  const unreadCounts = [
    {
      count: 0,
      companyId: 1,
    },
  ];

  useEffect(() => {
    if (companyId) {
      const selected: any = companies.find((c) => c.id === Number(companyId));

      setSelectedCompany(selected);
    }
  }, [companyId, companies]);

  return (
    <>
      {/* ✅ Small device */}
      <div className="md:hidden sm:mt-5">
        <div className={selectedCompany ? "hidden" : "block"}>
          <List
            companies={companies}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            unreadCounts={unreadCounts}
            isCollaborators={isCollaborators}
            companyAdmins={companyAdmins}
            setCompanyAdmins={setCompanyAdmins}
            companyId={currentUser?.companyId}
          />
        </div>

        <div className={selectedCompany ? "block" : "hidden"}>
          <CompanyArea
            selectedCompany={selectedCompany}
            currentUser={currentUser}
            previousMessages={messages}
            setSelectedCompany={setSelectedCompany}
          />
        </div>
      </div>

      {/* ✅ Medium & Large device — existing code */}
      <div className="hidden md:flex gap-5 sm:mt-5">
        <List
          companies={companies}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          unreadCounts={unreadCounts}
          isCollaborators={isCollaborators}
          companyAdmins={companyAdmins}
          setCompanyAdmins={setCompanyAdmins}
          companyId={currentUser?.companyId}
        />

        <CompanyArea
          selectedCompany={selectedCompany}
          currentUser={currentUser}
          previousMessages={messages}
        />
      </div>
    </>
  );
}
