import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { User } from "@prisma/client";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Body from "./Body";

export const metadata: Metadata = {
  title: "Communication Hub - Internal",
  description: "Manage client and supplier collaboration",
};

export default async function InternalPage(props: {
  searchParams: Promise<{ id?: string; groupId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { id: selectedUserId, groupId } = searchParams;
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Session ID is required");
  }

  // Both sidebar lists (users + groups) and per-pair chatTrack rows are now
  // driven by paginated react-query hooks on the client
  // (`useInfiniteUsersList` / `useInfiniteGroupsList` + the `userList` API
  // route hydrates `chatTrack`). Server-side eager fetches removed.
  const usersWithLatestMessages: any[] = [];
  const messages: any[] = [];
  const groups: any[] = [];
  const userChatTrack: any[] = [];

  const selectedUser = selectedUserId
    ? await db.user.findUnique({
        where: {
          id: parseInt(selectedUserId),
          companyId: session?.user?.companyId,
        },
      })
    : null;

  const selectedGroup = groupId
    ? await db.group.findUnique({
        where: {
          id: parseInt(groupId),
          companyId: session?.user?.companyId,
        },
        include: { users: true },
      })
    : null;

  return (
    <div className="flex gap-5 sm:mt-5">
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
        selectedGroup={selectedGroup}
      />
    </div>
  );
}
