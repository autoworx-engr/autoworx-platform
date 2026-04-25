"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const searchUsers = async (
  searchTerm: string,
  notNeededUser?: { id: number }[] | null,
) => {
  const session = await getServerSession(authOptions);
  let withoutNeedUser = [{ id: parseInt(session?.user?.id!) }];
  if (notNeededUser && notNeededUser.length) {
    withoutNeedUser = [...withoutNeedUser, ...notNeededUser];
  }
  try {
    const trimmed = searchTerm?.trim() ?? "";

    // Push search to the DB so we don't pull every company user into memory.
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const tokenWhere = tokens.map((token) => ({
      OR: [
        { firstName: { contains: token, mode: "insensitive" as const } },
        { lastName: { contains: token, mode: "insensitive" as const } },
        { email: { contains: token, mode: "insensitive" as const } },
        { phone: { contains: token } },
      ],
    }));

    const filteredUsers = await db.user.findMany({
      where: {
        companyId: session?.user?.companyId,
        NOT: withoutNeedUser,
        ...(tokens.length ? { AND: tokenWhere } : {}),
      },
      take: 50,
    });

    return {
      success: true,
      data: filteredUsers,
    };
  } catch (err: any) {
    throw new Error(err);
  }
};
