"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const searchGroups = async (searchTerm: string) => {
  const session = await getServerSession(authOptions);
  try {
    const groups = await db.group.findMany({
      where: {
        users: { some: { id: parseInt(session?.user?.id!) } },
        OR: [{ name: { contains: searchTerm } }],
      },
      include: {
        users: true,
      },
    });
    return {
      success: true,
      data: groups,
    };
  } catch (err: any) {
    throw new Error(err);
  }
};
