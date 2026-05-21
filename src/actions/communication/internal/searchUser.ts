"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { buildUserSearchWhere } from "./_utils/userSearch";

export const searchUsers = async (
  searchTerm: string,
  notNeededUser?: { id: number }[] | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { success: false, data: [] as never[] };
  }

  let withoutNeedUser = [{ id: parseInt(session.user.id) }];
  if (notNeededUser && notNeededUser.length) {
    withoutNeedUser = [...withoutNeedUser, ...notNeededUser];
  }

  const filteredUsers = await db.user.findMany({
    where: {
      companyId: session.user.companyId,
      NOT: withoutNeedUser,
      ...buildUserSearchWhere(searchTerm),
    },
    take: 50,
  });

  return { success: true, data: filteredUsers };
};
