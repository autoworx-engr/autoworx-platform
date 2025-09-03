import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { User } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Body, { TBodyProps } from "./Body";
import { fetchUsersWithLatestMessages } from "@/actions/communication/internal/fetchUsersWithLatestMessages";

export const metadata: Metadata = {
  title: "Communication Hub - Internal",
};

export default async function InternalPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const { id: selectedUserId } = searchParams;
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Session ID is required");
  }

  // Fetch users with their latest messages using the new action
  const result = await fetchUsersWithLatestMessages();
  
  let usersWithLatestMessages: any[] = [];
  let messages: any[] = [];
  
  if (result.success && result.data) {
    usersWithLatestMessages = result.data.users;
    messages = result.data.messages;
  } else {
    // Fallback to old method if the new action fails
    const users = await db.user.findMany({
      where: {
        NOT: {
          id: parseInt(session?.user?.id),
        },
        companyId: session?.user?.companyId,
      },
    });

    // Calculate unread message counts per user
    usersWithLatestMessages = users.map((user) => {
      return {
        ...user,
        unreadCount: 0,
        latestMessage: null,
      };
    });
  }

  // Fetch groups (this is still needed)
  const groups = await db.group.findMany({
    where: { users: { some: { id: parseInt(session?.user?.id!) } } },
    include: {
      users: true,
    },
  });

  // Fetch userChatTrack for compatibility
  const userChatTrack = await db.chatTrack.findMany({
    where: {
      OR: [
        { senderId: parseInt(session?.user?.id!) },
        { receiverId: parseInt(session?.user?.id!) },
      ],
    },
    include: {
      message: true,
    },
  });

  // const usersWithUnreadCounts = users.map((user) => {
  //   const unreadCount = userChatTrack.filter(
  //     (chat) =>
  //       chat.receiverId === parseInt(session?.user?.id!) &&
  //       chat.senderId === user.id &&
  //       !chat.isRead
  //   ).length;

  //   return {
  //     ...user,
  //     unreadCount,
  //   };
  // });
  const selectedUser = selectedUserId
    ? await db.user.findUnique({
        where: {
          id: parseInt(selectedUserId),
          companyId: session?.user?.companyId,
        },
      })
    : null;

  return (
    <div className="flex max-h-[95%] gap-5 sm:mt-5">
      <Body
        users={usersWithLatestMessages}
        currentUser={session.user}
        groups={groups}
        userChatTrack={userChatTrack}
        messages={messages}
        selectedUser={
          selectedUser
            ? { ...selectedUser, unreadCount: 0, latestMessage: null } as (User & { unreadCount: number; latestMessage?: any })
            : null
        }
      />
    </div>
  );
}
