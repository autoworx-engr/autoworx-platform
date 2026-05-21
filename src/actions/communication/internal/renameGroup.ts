"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export const renameGroup = async (name: string, groupId: number) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, success: false, message: "Unauthorized" };
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return { status: 400, success: false, message: "Group name is required." };
  }

  const currentUserId = parseInt(session.user.id);
  const companyId = session.user.companyId;

  const existingGroup = await db.group.findFirst({
    where: {
      id: groupId,
      companyId,
      users: { some: { id: currentUserId } },
    },
    select: { id: true },
  });
  if (!existingGroup) {
    return { status: 404, success: false, message: "Group not found" };
  }

  const duplicateName = await db.group.findFirst({
    where: {
      companyId,
      name: { equals: normalizedName, mode: "insensitive" },
      NOT: { id: groupId },
    },
    select: { id: true },
  });
  if (duplicateName) {
    return {
      status: 409,
      success: false,
      message: "Group name already exists.",
    };
  }

  await db.group.update({
    where: { id: groupId },
    data: { name: normalizedName },
  });

  revalidatePath("/dashboard/communication/internal");
  return {
    status: 200,
    success: true,
    message: "Group renamed successfully",
  };
};
