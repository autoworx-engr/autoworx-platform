import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { User } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Body from "./Body";

export const metadata: Metadata = {
  title: "Communication Hub - Internal",
};

export default async function InternalPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { id: selectedUserId } = searchParams;
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Session ID is required");
  }

  // The sidebar users list is now driven by `useInfiniteUsersList` on the
  // client (via react-query), so we no longer eagerly fetch every user +
  // every message on the server. Pass an empty initial set; the hook picks up
  // page 1 on mount.
  const usersWithLatestMessages: any[] = [];
  const messages: any[] = [];

  // Fetch groups (this is still needed)
  const groups = await db.group.findMany({
    where: { users: { some: { id: parseInt(session?.user?.id!) } } },
    include: {
      users: true,
    },
    orderBy: { updatedAt: "desc" },
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
            ? ({
                ...selectedUser,
                unreadCount: 0,
                latestMessage: null,
              } as User & { unreadCount: number; latestMessage?: any })
            : null
        }
      />
    </div>
  );
}
