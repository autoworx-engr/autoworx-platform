import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import "server-only";

export async function getUserFromSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user) {
    throw new Error("No session or user found");
  }

  return session.user;
}
