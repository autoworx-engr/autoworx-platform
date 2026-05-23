"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getPusherInstance } from "@/lib/pusher/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { findDuplicateGroupName } from "./_utils/groupName";
import { normalizeGroupName } from "@/lib/utils/groupName";

type TCreateGroup = {
  name: string;
  users: { id: number }[];
};

const pusher = getPusherInstance();

export const createGroup = async ({ name, users }: TCreateGroup) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, message: "Unauthorized" };
  }

  const companyId = session.user.companyId;
  const normalizedName = normalizeGroupName(name);
  if (!normalizedName) {
    return { status: 400, message: "Group name is required." };
  }

  const existingGroup = await findDuplicateGroupName(companyId, normalizedName);
  if (existingGroup) {
    return { status: 409, message: "Group name already exists." };
  }

  const userIds = users.map((u) => u.id);
  const validUsers = await db.user.findMany({
    where: { id: { in: userIds }, companyId },
    select: { id: true },
  });
  if (validUsers.length !== userIds.length) {
    return { status: 400, message: "One or more users not found in company" };
  }

  const groupData = await db.group.create({
    data: {
      name: normalizedName,
      companyId,
      users: { connect: users },
    },
    include: { users: true },
  });

  pusher.trigger("create-group", "create", {
    groupId: groupData.id,
    usersIds: users,
  });

  revalidatePath("/dashboard/communication/internal");
  return { status: 200, data: groupData };
};
