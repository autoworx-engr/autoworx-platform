"use client";

import { cn } from "@/lib/cn";
import { ChatTrack, Group, Message, User } from "@prisma/client";
import { Session } from "next-auth";
import { useEffect, useState } from "react";
import List from "./List";
import UsersArea from "./UsersArea";

type TBodyProps = {
  users: User[];
  currentUser: Session["user"];
  groups: (Group & { users: User[] })[];
  userChatTrack: (ChatTrack & { message?: Message | null })[];
};

export default function Body({
  users,
  currentUser,
  groups,
  userChatTrack,
}: TBodyProps) {
  const [usersList, setUsersList] = useState<User[]>([]);

  const [groupsList, setGroupsList] = useState<(Group & { users: User[] })[]>(
    [],
  );

  // for mobile responsive
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        if (usersList.length > 1) {
          setUsersList((prev) => [prev[0]]);
        }
        if (groupsList.length > 1) {
          setGroupsList((prev) => [prev[0]]);
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [usersList.length]);

  const totalLengthOfUsersAndGroups = usersList.length + groupsList.length;

  return (
    <>
      <List
        className={cn(totalLengthOfUsersAndGroups === 0 ? "block" : "hidden")}
        groups={groups}
        users={users}
        groupsList={groupsList}
        usersList={usersList}
        setUsersList={setUsersList}
        setGroupsList={
          setGroupsList as React.Dispatch<
            React.SetStateAction<(Group & { users: User[] }[]) | []>
          >
        }
        userChatTrack={userChatTrack}
      />
      <UsersArea
        className={cn(totalLengthOfUsersAndGroups === 0 ? "hidden" : "block")}
        usersList={usersList}
        setUsersList={setUsersList}
        currentUser={currentUser}
        groupsList={groupsList}
        setGroupsList={setGroupsList}
      />
    </>
  );
}
