import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import "server-only";
import { db } from "./db";

export async function getUserFromSession(userId?: number) {
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id.toString(),
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      image: user.image ?? null,
      role: user.role,
      companyId: user.companyId,
      employeeType: user.employeeType,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  // CASE 2: Get from NextAuth session
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("No session or user found");
  }

  return {
    id: session.user.id.toString(),
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    role: session.user.role,
    companyId: session.user.companyId,
    employeeType: session.user.employeeType,
    isSuperAdmin: session.user.isSuperAdmin,
  };
}
