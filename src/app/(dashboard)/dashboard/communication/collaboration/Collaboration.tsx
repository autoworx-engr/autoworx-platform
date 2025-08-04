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
  const [selectedUsersList, setSelectedUsersList] = useState<User[]>([]);
  const [companyAdmins, setCompanyAdmins] = useState(companyWithAdmin);
  
  // Use the hook to get real-time unread message counts
  const unreadCounts = useUnreadCollaborationMessages(parseInt(currentUser?.id));

  return (
    <div className="flex gap-5 sm:mt-5">
      <List
        className={cn(selectedUsersList.length === 0 ? "block" : "hidden")}
        selectedUsersList={selectedUsersList}
        companyAdmins={companyAdmins}
        setCompanyAdmins={setCompanyAdmins}
        companies={companies}
        setSelectedUsersList={setSelectedUsersList}
        unreadCounts={unreadCounts}
        currentUserId={parseInt(currentUser?.id)}
      />
      <UsersArea
        className={cn(selectedUsersList.length === 0 ? "hidden" : "grid")}
        previousMessages={messages}
        currentUser={currentUser}
        totalMessageBoxLength={selectedUsersList.length}
        selectedUsersList={selectedUsersList}
        setSelectedUsersList={setSelectedUsersList}
      />
    </div>
  );
}
