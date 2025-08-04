"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { EmployeeType, Prisma, Task } from "@prisma/client";
import { getServerSession } from "next-auth";

export default async function getTasks(params?: Prisma.TaskFindManyArgs) {
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
    if (
      employeeType === "Admin" ||
      employeeType === "Manager" ||
      employeeType === "Sales"
    ) {
      tasks = await db.task.findMany({
        where: {
          companyId,
          ...(where || {}),
        },
        ...restParams,
      });

      totalTasks = await db.task.count({
        where: {
          companyId,
        },
      });
    } else {
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("User ID is required to fetch tasks.");
      }

      const whereCondition = {
        companyId,
        OR: [
          {
            taskUser: {
              some: {
                userId: +userId,
              },
            },
          },
          {
            userId: +userId,
          },
        ],
      };
      tasks = await db.task.findMany({
        where: {
          ...whereCondition,
          ...(where || {}),
        },
        ...restParams,
      });

      totalTasks = await db.task.count({
        where: whereCondition,
      });
    }
    return {
      data: tasks,
      totalTask: totalTasks,
    };
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
