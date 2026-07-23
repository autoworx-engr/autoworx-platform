"use client";

import { cn } from "@/lib/cn";
import { ChatTrack, Group, Message, User } from "@prisma/client";
import { Session } from "next-auth";
import { useEffect, useState } from "react";
import List from "./List";
import UsersArea, { ChatListItem } from "./UsersArea";

type TUser = User & { unreadCount: number; latestMessage?: Message | null };
type TGroup = Group & { users: User[] };

export type TBodyProps = {
  users: TUser[];
  currentUser: Session["user"];
  groups: TGroup[];
  userChatTrack: (ChatTrack & { message?: Message | null })[];
  selectedUser: TUser | null;
  selectedGroup?: TGroup | null;
  messages?: Message[];
};

export default function Body({
  users,
  currentUser,
  groups,
  userChatTrack,
  selectedUser,
  selectedGroup,
  messages = [],
}: TBodyProps) {
  const [chatList, setChatList] = useState<ChatListItem[]>(() => {
    const initial: ChatListItem[] = [];
    if (selectedUser) {
      initial.push({
        id: `user-${selectedUser.id}`,
        type: "user",
        data: selectedUser,
        timestamp: Date.now(),
      });
    }
    if (selectedGroup) {
      initial.push({
        id: `group-${selectedGroup.id}`,
        type: "group",
        data: selectedGroup,
        timestamp: Date.now(),
      });
    }
    return initial;
  });

  const usersList = chatList
    .filter(
      (chat): chat is Extract<ChatListItem, { type: "user" }> =>
        chat.type === "user",
    )
    .map((chat) => chat.data);
  const groupsList = chatList
    .filter(
      (chat): chat is Extract<ChatListItem, { type: "group" }> =>
        chat.type === "group",
    )
    .map((chat) => chat.data);

  const setUsersList: React.Dispatch<React.SetStateAction<TUser[]>> = (
    updater,
  ) => {
    if (typeof updater !== "function") return;
    setChatList((currentList) => {
      const currentUsers = currentList
        .filter(
          (c): c is Extract<ChatListItem, { type: "user" }> =>
            c.type === "user",
        )
        .map((c) => c.data);
      const newUsers = (updater as (prev: TUser[]) => TUser[])(currentUsers);
      const userChats: ChatListItem[] = newUsers.map((user, index) => ({
        id: `user-${user.id}`,
        type: "user",
        data: user,
        timestamp:
          currentList.find((c) => c.id === `user-${user.id}`)?.timestamp ||
          Date.now() + index,
      }));
      const nonUserChats = currentList.filter((c) => c.type !== "user");
      return [...userChats, ...nonUserChats].slice(0, 4);
    });
  };

  const setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>> = (
    updater,
  ) => {
    if (typeof updater !== "function") return;
    setChatList((currentList) => {
      const currentGroups = currentList
        .filter(
          (c): c is Extract<ChatListItem, { type: "group" }> =>
            c.type === "group",
        )
        .map((c) => c.data);
      const newGroups = (updater as (prev: TGroup[]) => TGroup[])(
        currentGroups,
      );
      const groupChats: ChatListItem[] = newGroups.map((group, index) => ({
        id: `group-${group.id}`,
        type: "group",
        data: group,
        timestamp:
          currentList.find((c) => c.id === `group-${group.id}`)?.timestamp ||
          Date.now() + index,
      }));
      const nonGroupChats = currentList.filter((c) => c.type !== "group");
      return [...nonGroupChats, ...groupChats].slice(0, 4);
    });
  };

  const addChatItem = (item: TUser | TGroup, type: "user" | "group") => {
    setChatList((currentList) => {
      const chatId = `${type}-${item.id}`;
      const existingIndex = currentList.findIndex((c) => c.id === chatId);

      const data =
        type === "user"
          ? ({ ...(item as TUser), unreadCount: 0 } as TUser)
          : (item as TGroup);
      const newChat: ChatListItem =
        type === "user"
          ? {
              id: chatId,
              type: "user",
              data: data as TUser,
              timestamp: Date.now(),
            }
          : {
              id: chatId,
              type: "group",
              data: data as TGroup,
              timestamp: Date.now(),
            };

      if (existingIndex !== -1) {
        const updated = [...currentList];
        updated[existingIndex] = {
          ...updated[existingIndex],
          data: newChat.data,
        } as ChatListItem;
        return updated;
      }
      if (currentList.length >= 4) {
        const updated = [...currentList];
        updated[3] = newChat;
        return updated;
      }
      return [...currentList, newChat];
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        setChatList((currentList) => currentList.slice(0, 1));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalLengthOfUsersAndGroups = usersList.length + groupsList.length;

  return (
    <>
      <List
        className={cn(
          totalLengthOfUsersAndGroups === 0 ? "block" : "hidden lg:block",
        )}
        groups={groups}
        users={users}
        groupsList={groupsList}
        usersList={usersList}
        setUsersList={setUsersList}
        setGroupsList={setGroupsList}
        addChatItem={addChatItem}
        userChatTrack={userChatTrack}
        messages={messages}
      />
      <UsersArea
        className={cn(
          totalLengthOfUsersAndGroups === 0 ? "hidden lg:hidden" : "block",
        )}
        usersList={usersList}
        setUsersList={setUsersList}
        currentUser={currentUser}
        groupsList={groupsList}
        setGroupsList={setGroupsList}
        chatList={chatList}
      />
    </>
  );
}
