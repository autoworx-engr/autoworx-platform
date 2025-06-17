import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { planObject } from "@/utils/planObject";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Body from "./Body";

export const metadata: Metadata = {
  title: "Communication Hub - Internal",
};

export default async function InternalPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Session ID is required");
  }

  const users = await db.user.findMany({
    where: {
      NOT: {
        id: parseInt(session?.user?.id),
      },
      companyId: session?.user?.companyId,
    },
  });

  const groups = await db.group.findMany({
    where: { users: { some: { id: parseInt(session?.user?.id!) } } },
    include: {
      users: true,
    },
  });

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

  return (
    <div className="flex max-h-[95%] gap-5 sm:mt-5">
      <Body
        users={planObject(users)}
        currentUser={session.user}
        groups={planObject(groups)}
        userChatTrack={userChatTrack}
      />
    </div>
  );
}
