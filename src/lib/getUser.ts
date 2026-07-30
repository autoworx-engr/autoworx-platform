"use server";
import { authOptions } from "@/authOptions";
import { planObject } from "@/utils/planObject";
import { User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { db } from "./db";
import { cache } from "react";
import { redirect } from "next/navigation";

const getUser = cache(async function (userId?: number): Promise<User> {
  const session = await getServerSession(authOptions);
  if (!userId && (!session || !session.user)) {
    // throw new Error("Unauthorized access: No session found");
    redirect("/login");
  }
  let user = (await db.user.findFirst({
    where: {
      id: userId ? userId : Number(session?.user?.id),
    },
  })) as User;
  return user;
});

export default getUser;
