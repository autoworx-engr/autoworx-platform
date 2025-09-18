"use server";
import { db } from "@/lib/db";
import { generateAccessToken } from "@/lib/tokenGenerator";

export async function companyWithUser({ companyId }: { companyId: number }) {
  const data = await db.company.findFirst({
    where: {
      id: companyId,
      users: { some: { employeeType: "Admin" } },
    },
    include: { users: true },
  });

  const user = data?.users?.[0];

  if (!user) {
    throw new Error("User not found");
  }

  const newAccessToken = generateAccessToken(user) as string;

  return newAccessToken;
}
