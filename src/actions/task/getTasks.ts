"use server";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma, Task } from "@prisma/client";
import { getServerSession } from "next-auth";

type TaskWhereInput = {
  date?: Prisma.TaskWhereInput["date"];
  title?: Prisma.TaskWhereInput["title"];
  OR?: Prisma.TaskWhereInput["OR"];
  AND?: Prisma.TaskWhereInput["AND"];
};

export type TaskQueryParams = {
  where?: TaskWhereInput;
  include?: Prisma.TaskInclude;
  select?: Prisma.TaskSelect;
  orderBy?: Prisma.TaskFindManyArgs["orderBy"];
  skip?: number;
  take?: number;
};

export default async function getTasks(params?: TaskQueryParams) {
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

    const baseConditions: Prisma.TaskWhereInput[] = [
      { companyId },
      { status: "pending" },
      {
        OR: [{ userId: +userId }, { taskUser: { some: { userId: +userId } } }],
      },
    ];

    const whereCondition: Prisma.TaskWhereInput = {
      AND: [...baseConditions, ...(where ? [where] : [])],
    };

    const countWhere: Prisma.TaskWhereInput = {
      AND: baseConditions,
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
      db.task.count({ where: countWhere }),
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
