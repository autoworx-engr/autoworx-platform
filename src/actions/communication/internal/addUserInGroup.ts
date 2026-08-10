"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

type TAddGroupInUser = {
  groupId: number;
  users: { id: number }[];
};

const pusher = getPusherInstance();

export const addUserInGroup = async ({ groupId, users }: TAddGroupInUser) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, message: "Unauthorized" };
  }

  const currentUserId = parseInt(session.user.id, 10);
  if (!Number.isFinite(currentUserId)) {
    return { status: 401, message: "Unauthorized" };
  }
  const companyId = session.user.companyId;

  // Legacy groups can have companyId = null. Membership check still enforces
  // tenant isolation since users belong to exactly one company.
  const existingGroup = await db.group.findFirst({
    where: {
      id: groupId,
      OR: [{ companyId }, { companyId: null }],
      users: { some: { id: currentUserId } },
    },
    select: { id: true },
  });

  if (!existingGroup) {
    return { status: 404, message: "Group not found" };
  }

  const userIds = users.map((u) => u.id);
  const validUsers = await db.user.findMany({
    where: { id: { in: userIds }, companyId },
    select: { id: true },
  });
  if (validUsers.length !== userIds.length) {
    return { status: 400, message: "One or more users not found in company" };
  }

  const groupData = await db.group.update({
    where: { id: groupId },
    data: { users: { connect: users } },
    include: { users: true },
  });

  pusher.trigger("add-member-in-group", "add-member", {
    groupId: groupData.id,
    userIds: users,
  });

  revalidatePath("/dashboard/communication/internal");
  return { status: 200, data: groupData };
};
