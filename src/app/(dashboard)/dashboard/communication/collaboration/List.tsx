import React, { useState } from "react";
import Image from "next/image";
import { Company, User } from "@prisma/client";
import { cn } from "@/lib/cn";
import CollaborationToggle from "./CollaborationToggle";

type TProps = {
  companyAdmins: Partial<User>[];
  setCompanyAdmins: React.Dispatch<React.SetStateAction<Partial<User>[]>>;
  setSelectedUsersList: React.Dispatch<React.SetStateAction<any[]>>;
  companies: (Company & { users: User[] })[];
  selectedUsersList: User[];
  className?: string;
  unreadCounts: {
    count: number;
    lastMessage: string;
    createdAt: Date;
    senderId: number;
  }[];
  currentUserId: number;
  isCollaborators: boolean | null | undefined;
  companyId: number;
};

export default function List({
  selectedUsersList,
  companyAdmins,
  setSelectedUsersList,
  companies,
  setCompanyAdmins,
  className,
  unreadCounts,
  currentUserId,
  isCollaborators,
  companyId,
}: TProps) {
  const [selectedCompany, setSelectedCompany] = useState<
    (Company & { users: User[] }) | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to get unread count for a company (total from all users in that company)
  const getCompanyUnreadCount = (company: Company & { users: User[] }) => {
    return company.users.reduce((total, user) => {
      const userUnread = unreadCounts.find((u) => u.senderId === user.id);
      return total + (userUnread?.count || 0);
    }, 0);
  };

  // Helper function to get unread count for a specific user
  const getUserUnreadCount = (userId: number) => {
    const userUnread = unreadCounts.find((u) => u.senderId === userId);
    return userUnread?.count || 0;
  };

  return (
    <div
      className={cn(
        "app-shadow h-screen w-full overflow-y-auto rounded-lg bg-background p-3 sm:block sm:h-[83vh] sm:w-[23%]",
        className
      )}
    >
      {/* Header */}
      <CollaborationToggle
        companyId={companyId}
        initialValue={isCollaborators ?? false}
        companies={companies}
        setCompanyAdmins={setCompanyAdmins}
        companyAdmins={companyAdmins}
      />

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const searchTerm = formData.get("searchTerm") as string;
          setSearchTerm(searchTerm);
        }}
      >
        <input
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
          type="text"
          placeholder="Search by company or admin"
          name="searchTerm"
          className="my-3 mr-2 w-full rounded-md border-2 border-[#006D77] p-2 text-base text-[#797979] max-[1822px]:w-full"
        />
      </form>

      {/* List */}
      <div className="mt-2 flex h-[88%] flex-col gap-2 overflow-y-auto max-[2127px]:h-[80%]">
        {companies
          .filter((company) => {
            return (
              company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              company.users.some((user) => {
                const fullName = `${user.firstName} ${user.lastName}`;
                return (
                  fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  user.email.toLowerCase().includes(searchTerm.toLowerCase())
                );
              })
            );
          })
          .map((company) => {
            if (selectedCompany && selectedCompany.id === company.id) {
              return (
                <div
                  key={company.id}
                  className={cn(
                    "rounded-lg bg-gradient-to-r from-teal-700 to-teal-600 p-2",
                    "ring-1 ring-teal-500/60"
                  )}
                >
                  <button
                    className="flex h-[78px] w-full items-center justify-start gap-1"
                    onClick={() => setSelectedCompany(null)}
                  >
                    <Image
                      src={
                        company.image ? company.image : "/icons/business.png"
                      }
                      alt={company.name}
                      width={50}
                      height={50}
                      className="rounded-full max-[1400px]:h-[40px] max-[1400px]:w-[40px]"
                    />

                    <p className="w-full truncate text-left text-[12px] font-bold text-white">
                      {company.name}
                    </p>
                  </button>

                  <div className="flex max-h-[300px] flex-col items-center gap-1 overflow-y-auto">
                    {company.users.map((user: User) => {
                      const isSelectedUser = !!selectedUsersList.find(
                        (u) => u.id === user.id
                      );
                      return (
                        <button
                          key={user.id}
                          className={cn(
                            "#min-h-[61px] flex w-full items-center gap-2 rounded-md bg-[#F2F2F2] p-1 hover:bg-gray-300",
                            isSelectedUser &&
                            "bg-gradient-to-r from-[#006D77] to-[#008c99] hover:bg-stone-400 border border-white"
                          )}
                          onClick={() => {
                            // add this user to the list (if not already in it)
                            setSelectedUsersList((usersList) => {
                              if (usersList.length >= 4) return usersList;
                              if (usersList.find((u) => u.id === user.id)) {
                                return usersList;
                              }
                              return [
                                ...usersList,
                                { ...user, companyName: company.name },
                              ];
                            });
                          }}
                        >
                          <Image
                            src={
                              user.image?.includes("default.png")
                                ? user.image
                                : user.image
                            }
                            alt={user.firstName}
                            width={30}
                            height={30}
                            className="rounded-full max-[1400px]:h-[40px] max-[1400px]:w-[40px]"
                          />
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "text-[12px] font-bold text-[#797979]",
                                  isSelectedUser && "text-white"
                                )}
                              >
                                {user.firstName} {user.lastName}
                              </p>
                              {/* Red dot for user with unread messages */}
                              {getUserUnreadCount(user.id) > 0 && (
                                <div className="h-3 w-3 rounded-full bg-red-500 flex items-center justify-center">
                                  <span className="text-white text-[10px] font-bold">
                                    {getUserUnreadCount(user.id) > 9
                                      ? "9+"
                                      : getUserUnreadCount(user.id)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={company.id}
                className={cn(
                  "flex items-center gap-2 rounded-2xl bg-[#F2F2F2] p-2",
                  "border border-transparent shadow-sm transition-all duration-200",
                  "hover:shadow-md active:scale-[0.99]",
                  "bg-white dark:bg-zinc-900/60",
                  "border-zinc-200/70 dark:border-white/10",
                  "hover:border-zinc-300/80 dark:hover:border-white/20"
                )}
                onClick={() => setSelectedCompany(company)}
              >
                <Image
                  src={company.image ? company.image : "/icons/business.png"}
                  alt={company.name}
                  width={50}
                  height={50}
                  className="rounded-full max-[1400px]:h-[40px] max-[1400px]:w-[40px]"
                />

                <div className="flex items-center gap-2 flex-1">
                  <p className="truncate text-left text-[12px] font-bold text-[#797979]">
                    {company.name}
                  </p>
                  {/* Red dot for company with unread messages */}
                  {getCompanyUnreadCount(company) > 0 && (
                    <div className="h-3 w-3 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">
                        {getCompanyUnreadCount(company) > 9
                          ? "9+"
                          : getCompanyUnreadCount(company)}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
