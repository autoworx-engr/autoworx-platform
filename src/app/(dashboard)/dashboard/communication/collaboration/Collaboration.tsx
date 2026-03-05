"use client";

import { cn } from "@/lib/cn";
import {
  Attachment,
  Company,
  Message as DbMessage,
  User,
} from "@prisma/client";
import { Session } from "next-auth";
import { useState } from "react";
import List from "./List";
import UsersArea from "./UsersArea";
import { useUnreadCollaborationMessages } from "./hooks/useUnreadCollaborationMessages";
import CompanyArea from "./CompanyArea";

export default function Collaboration({
  companyWithAdmin,
  companies,
  currentUser,
  messages,
}: {
  companyWithAdmin: Partial<User>[];
  companies: (Company & { users: User[] })[];
  currentUser: Session["user"];
  messages: (DbMessage & { attachment: Attachment[] | null })[];
}) {
  // const [selectedUsersList, setSelectedUsersList] = useState<User[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState(companyWithAdmin);

  // Use the hook to get real-time unread message counts
  const unreadCounts = [
    {
      count: 0,
      companyId: 1,
    },
  ];
  // const unreadCounts = useUnreadCollaborationMessages(
  //   parseInt(currentUser?.id),
  // );

  return (
    <div className="flex gap-5 sm:mt-5">
      <List
        companies={companies}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        unreadCounts={unreadCounts}
      />

      <CompanyArea
        selectedCompany={selectedCompany}
        currentUser={currentUser}
        previousMessages={messages}
        // companies={companies}
      />
    </div>
  );
}
