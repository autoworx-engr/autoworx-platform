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

  // Both sidebar lists (users + groups) are now driven by paginated
  // react-query hooks on the client (`useInfiniteUsersList` /
  // `useInfiniteGroupsList`), so we no longer eagerly fetch on the server.
  const usersWithLatestMessages: any[] = [];
  const messages: any[] = [];
  const groups: any[] = [];

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
