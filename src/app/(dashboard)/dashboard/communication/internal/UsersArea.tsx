import { cn } from "@/lib/cn";
import {
  Attachment,
  Group,
  Message as PrismaMessage,
  RequestEstimate,
  User,
} from "@prisma/client";
import { Session } from "next-auth";
import React from "react";
import GroupMessageBox from "./GroupMessageBox";
import UserMessageBox from "./UserMessageBox";
import EmptyMessageBox from "./EmptyMessageBox";

type TUser = User & {
  unreadCount: number;
  latestMessage?: PrismaMessage | null;
};
type TGroup = Group & { users: User[] };
export type ChatListItem =
  | { id: string; type: "user"; data: TUser; timestamp: number }
  | { id: string; type: "group"; data: TGroup; timestamp: number };

export interface MessageQue {
  user: number;
  messages: (Message & { attachment: Attachment[] | null })[];
}

export interface TGroupMessage {
  groupId: number;
  messages: Message[];
}

export interface Message {
  userId?: number;
  message: string;
  sender: "CLIENT" | "USER";
  attachment?: Attachment[] | null;
  requestEstimate?: RequestEstimate | null;
  createdAt: Date;
  senderInfo?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
}

export default function UsersArea({
  currentUser,
  usersList,
  setUsersList,
  groupsList,
  setGroupsList,
  className,
  chatList,
}: {
  currentUser: Session["user"];
  usersList: TUser[];
  setUsersList: React.Dispatch<React.SetStateAction<TUser[]>>;
  setGroupsList: React.Dispatch<React.SetStateAction<TGroup[]>>;
  groupsList: TGroup[];
  className?: string;
  chatList?: ChatListItem[];
}) {
  const totalMessageBoxLength = usersList.length + groupsList.length;

  // If we have a unified chat list, use that for ordering
  const renderChatBoxes = (): React.JSX.Element[] => {
    if (chatList) {
      // Use the unified chat list which preserves the exact opening order
      return chatList.map((chat) => {
        if (chat.type === "user") {
          return (
            <UserMessageBox
              key={chat.id}
              user={chat.data}
              setUsersList={setUsersList}
              totalMessageBoxLength={totalMessageBoxLength}
            />
          );
        } else {
          return (
            <GroupMessageBox
              key={chat.id}
              group={chat.data}
              setGroupsList={setGroupsList}
              totalMessageBox={totalMessageBoxLength}
              existingGroups={groupsList}
            />
          );
        }
      });
    }

    // Fallback to old method if chatList is not available
    const allChats: React.JSX.Element[] = [];

    usersList.forEach((user) => {
      allChats.push(
        <UserMessageBox
          key={`user-${user.id}`}
          user={user}
          setUsersList={setUsersList}
          totalMessageBoxLength={totalMessageBoxLength}
        />,
      );
    });

    groupsList.forEach((group) => {
      allChats.push(
        <GroupMessageBox
          key={`group-${group.id}`}
          group={group}
          setGroupsList={setGroupsList}
          totalMessageBox={totalMessageBoxLength}
          existingGroups={groupsList}
        />,
      );
    });

    return allChats;
  };

  return (
    <div
      className={cn(
        "w-full gap-3 sm:grid md:h-[88vh]",
        totalMessageBoxLength > 1 ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {renderChatBoxes()}

      {totalMessageBoxLength === 3 && (
        <div
          className={cn(
            "app-shadow flex w-full border-spacing-4 flex-col overflow-hidden rounded-lg max-[1400px]:w-[100%]",
            totalMessageBoxLength > 2 && "sm:h-[44vh]",
          )}
          style={{
            borderWidth: "4px",
            borderColor: "#006D77",
            borderStyle: "dashed",
            backgroundColor: "#DFEBED",
          }}
        />
      )}

      {totalMessageBoxLength === 0 && <EmptyMessageBox />}
    </div>
  );
}
