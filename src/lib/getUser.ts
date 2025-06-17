"use server";
import { authOptions } from "@/authOptions";
import { planObject } from "@/utils/planObject";
import { User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { db } from "./db";

export default async function getUser(userId?: number): Promise<User> {
  const session = await getServerSession(authOptions);
  let user = (await db.user.findFirst({
    where: {
      id: userId ? userId : Number(session?.user?.id),
    },
  })) as User;
  return planObject(user);
}
