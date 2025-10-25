"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { EmployeeType, Prisma, Task } from "@prisma/client";
import { getServerSession } from "next-auth";

export default async function getAllTasks(params?: Prisma.TaskFindManyArgs) {
  const session = await getServerSession(authOptions);
  try {
    const companyId = session?.user?.companyId;
    if (!companyId) {
      throw new Error("Company ID is required to fetch tasks.");
    }
    const employeeType = session?.user?.employeeType as EmployeeType;
    let tasks: Task[] = [];
    let totalTasks: number = 0;

    const { where, ...restParams } = params || {};
    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("User ID is required to fetch tasks.");
    }

    // Get tasks created by user OR assigned to user
    const whereCondition = {
      companyId,
      //   OR: [
      //     { userId: +userId }, // Tasks created by the user
      //     { taskUser: { some: { userId: +userId } } }, // Tasks assigned to the user
      //   ],
      ...(where || {}),
    };

    tasks = await db.task.findMany({
      where: whereCondition,
      ...restParams,
    });

    totalTasks = await db.task.count({
      where: {
        companyId,
        // OR: [{ userId: +userId }, { taskUser: { some: { userId: +userId } } }],
      },
    });

    return {
      data: tasks,
      totalTask: totalTasks,
    };
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
