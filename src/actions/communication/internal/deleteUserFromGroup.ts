"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { deleteGroupIfEmpty } from "./_utils/deleteGroupIfEmpty";

const pusher = getPusherInstance();

export const deleteUserFromGroup = async (userId: number, groupId: number) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, message: "Unauthorized" };
  }

  const currentUserId = parseInt(session.user.id);
  // Legacy groups can have companyId = null; membership check enforces tenant isolation.
  const existingGroup = await db.group.findFirst({
    where: {
      id: groupId,
      OR: [{ companyId: session.user.companyId }, { companyId: null }],
      users: { some: { id: currentUserId } },
    },
    select: { id: true },
  });
  if (!existingGroup) {
    return { status: 404, message: "Group not found" };
  }

  const groupDeleted = await db.$transaction(async (tx) => {
    await tx.group.update({
      where: { id: groupId },
      data: { users: { disconnect: { id: userId } } },
    });
    return deleteGroupIfEmpty(groupId, tx);
  });

  // Same `delete-group` event for both cases — the sidebar handler calls
  // `getGroupById`, which returns null when the group is gone (or when the
  // viewer is no longer a member), so both branches converge on the right UI.
  pusher.trigger("delete-group", "delete", { userId, groupId });

  revalidatePath("/dashboard/communication/internal");
  return {
    status: 200,
    message: groupDeleted
      ? "Group deleted (last member left)"
      : "User deleted from group",
  };
};
