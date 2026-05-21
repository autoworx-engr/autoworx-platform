"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export const searchGroups = async (searchTerm: string) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.companyId) {
    return { success: false, data: [] as never[] };
  }

  // Legacy groups can have companyId = null; membership filter enforces tenant
  // isolation because users belong to exactly one company.
  const groups = await db.group.findMany({
    where: {
      OR: [{ companyId: session.user.companyId }, { companyId: null }],
      users: { some: { id: parseInt(session.user.id) } },
      name: { contains: searchTerm, mode: "insensitive" },
    },
    include: { users: true },
    take: 50,
  });
  return { success: true, data: groups };
};
