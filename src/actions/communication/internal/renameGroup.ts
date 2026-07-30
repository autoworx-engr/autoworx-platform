"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { findDuplicateGroupName } from "./_utils/groupName";
import { normalizeGroupName } from "@/lib/utils/groupName";

export const renameGroup = async (name: string, groupId: number) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { status: 401, success: false, message: "Unauthorized" };
  }

  const normalizedName = normalizeGroupName(name);
  if (!normalizedName) {
    return { status: 400, success: false, message: "Group name is required." };
  }

  const currentUserId = parseInt(session.user.id);
  const companyId = session.user.companyId;

  // Legacy groups can have companyId = null; membership check enforces tenant isolation.
  const existingGroup = await db.group.findFirst({
    where: {
      id: groupId,
      OR: [{ companyId }, { companyId: null }],
      users: { some: { id: currentUserId } },
    },
    select: { id: true },
  });
  if (!existingGroup) {
    return { status: 404, success: false, message: "Group not found" };
  }

  // Duplicate-name check: only against groups the caller's company owns.
  // Legacy null-companyId groups aren't part of any tenant's namespace.
  const duplicateName = await findDuplicateGroupName(
    companyId,
    normalizedName,
    groupId,
  );
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
