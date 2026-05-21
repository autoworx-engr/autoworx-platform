"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

const pusher = getPusherInstance();

export const deleteUserFromGroup = async (userId: number, groupId: number) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, message: "Unauthorized" };
  }

  const currentUserId = parseInt(session.user.id);
  const existingGroup = await db.group.findFirst({
    where: {
      id: groupId,
      companyId: session.user.companyId,
      users: { some: { id: currentUserId } },
    },
    select: { id: true },
  });
  if (!existingGroup) {
    return { status: 404, message: "Group not found" };
  }

  await db.group.update({
    where: { id: groupId },
    data: { users: { disconnect: { id: userId } } },
  });

  pusher.trigger("delete-group", "delete", { userId, groupId });

  revalidatePath("/dashboard/communication/internal");
  return { status: 200, message: "User deleted from group" };
};
