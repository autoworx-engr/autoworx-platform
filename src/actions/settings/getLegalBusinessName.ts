"use server";

import { db } from "@/lib/db";

export async function getLegalBusinessName(token: string) {
  const company = await db.company.findUnique({
    where: {
      zapierToken: token,
    },
    select: {
      name: true,
    },
  });
  return company?.name;
}
