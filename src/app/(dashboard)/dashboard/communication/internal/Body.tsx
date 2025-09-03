"use client";

import { cn } from "@/lib/cn";
import { ChatTrack, Group, Message, User } from "@prisma/client";
import { Session } from "next-auth";
import { useEffect, useState } from "react";
import List from "./List";
import UsersArea from "./UsersArea";

export type TBodyProps = {
  users: (User & { unreadCount: number; latestMessage?: Message | null })[];
  currentUser: Session["user"];
  groups: (Group & { users: User[] })[];
  userChatTrack: (ChatTrack & { message?: Message | null })[];
  selectedUser: (User & { unreadCount: number; latestMessage?: Message | null }) | null;
  messages?: Message[];
};

export default function Body({
  users,
  currentUser,
  groups,
  userChatTrack,
  selectedUser,
  messages = [],
}: TBodyProps) {
  // Unified chat list instead of separate user and group lists
  const [chatList, setChatList] = useState<Array<{
    id: string;
    type: 'user' | 'group';
    data: any;
    timestamp: number;
  }>>(
    selectedUser ? [{
      id: `user-${selectedUser.id}`,
      type: 'user' as const,
      data: selectedUser,
      timestamp: Date.now()
    }] : []
  );

  // Derived state for backward compatibility
  const usersList = chatList.filter(chat => chat.type === 'user').map(chat => chat.data);
  const groupsList = chatList.filter(chat => chat.type === 'group').map(chat => chat.data);

  // Legacy setters for backward compatibility - they now update the unified list
  const setUsersList = (updater: any) => {
    if (typeof updater === 'function') {
      setChatList(currentList => {
        const currentUsers = currentList.filter(chat => chat.type === 'user').map(chat => chat.data);
        const newUsers = updater(currentUsers);
        const userChats = newUsers.map((user: any, index: number) => ({
          id: `user-${user.id}`,
          type: 'user' as const,
          data: user,
          timestamp: currentList.find(chat => chat.id === `user-${user.id}`)?.timestamp || Date.now() + index
        }));
        
        // Keep non-user chats and replace user chats
        const nonUserChats = currentList.filter(chat => chat.type !== 'user');
        return [...userChats, ...nonUserChats].slice(0, 4);
      });
    }
  };

  const setGroupsList = (updater: any) => {
    if (typeof updater === 'function') {
      setChatList(currentList => {
        const currentGroups = currentList.filter(chat => chat.type === 'group').map(chat => chat.data);
        const newGroups = updater(currentGroups);
        const groupChats = newGroups.map((group: any, index: number) => ({
          id: `group-${group.id}`,
          type: 'group' as const,
          data: group,
          timestamp: currentList.find(chat => chat.id === `group-${group.id}`)?.timestamp || Date.now() + index
        }));
        
        // Keep non-group chats and replace group chats
        const nonGroupChats = currentList.filter(chat => chat.type !== 'group');
        return [...nonGroupChats, ...groupChats].slice(0, 4);
      });
    }
  };

  // Helper function to add chat items with proper positioning
  const addChatItem = (item: any, type: 'user' | 'group') => {
    setChatList(currentList => {
      const chatId = `${type}-${item.id}`;
      const existingIndex = currentList.findIndex(chat => chat.id === chatId);
      
      if (existingIndex !== -1) {
        // Item exists, just update it without changing position
        const updated = [...currentList];
        updated[existingIndex] = {
          ...updated[existingIndex],
          data: type === 'user' ? { ...item, unreadCount: 0 } : item
        };
        return updated;
      }
      
      // New item - add to list
      const newChat = {
        id: chatId,
        type,
        data: type === 'user' ? { ...item, unreadCount: 0 } : item,
        timestamp: Date.now()
      };
      
      if (currentList.length >= 4) {
        // Replace the last item (4th position) - keep first 3 fixed
        const updated = [...currentList];
        updated[3] = newChat;
        return updated;
      } else {
        // Add to the end
        return [...currentList, newChat];
      }
    });
  };

  // for mobile responsive
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        // For mobile, keep only the first chat
        setChatList(currentList => currentList.slice(0, 1));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
        setGroupsList={setGroupsList}
        addChatItem={addChatItem}
        userChatTrack={userChatTrack}
        messages={messages}
      />
      <UsersArea
        className={cn(totalLengthOfUsersAndGroups === 0 ? "hidden" : "block")}
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
