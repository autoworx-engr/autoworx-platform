"use server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getTaskById(
  taskId: number,
  params?: Omit<Prisma.TaskFindUniqueArgs, "where">,
) {
  try {
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      ...params,
    });
    return task;
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
