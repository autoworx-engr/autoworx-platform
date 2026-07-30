"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma, Task } from "@prisma/client";
import { getServerSession } from "next-auth";
import { TaskQueryParams } from "./getTasks";

export default async function getAllTasks(params?: TaskQueryParams) {
  const session = await getServerSession(authOptions);
  try {
    const companyId = session?.user?.companyId;
    if (!companyId) {
      throw new Error("Company ID is required to fetch tasks.");
    }
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("User ID is required to fetch tasks.");
    }

    const { where, include, select, orderBy, skip, take } = params || {};

    const whereCondition: Prisma.TaskWhereInput = {
      AND: [{ companyId }, { status: "pending" }, ...(where ? [where] : [])],
    };

    const [tasks, totalTasks] = await Promise.all([
      db.task.findMany({
        where: whereCondition,
        ...(include ? { include } : {}),
        ...(select ? { select } : {}),
        ...(orderBy ? { orderBy } : {}),
        ...(skip !== undefined ? { skip } : {}),
        ...(take !== undefined ? { take } : {}),
      }) as Promise<Task[]>,
      db.task.count({ where: { companyId, status: "pending" } }),
    ]);

    return {
      data: tasks,
      totalTask: totalTasks,
    };
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
