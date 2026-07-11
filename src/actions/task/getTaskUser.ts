"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

export default async function getTaskUser(userId: number) {
  const companyId = await getCompanyId();
  try {
    const taskUsers = await db.taskUser.findMany({
      where: { userId },
    });

    const tasks = await db.task.findMany({
      where: {
        id: {
          in: taskUsers.map((taskUser) => taskUser.taskId),
        },
        companyId,
        status: "pending",
      },
      select: {
        id: true,
        title: true,
        priority: true,
        description: true,
        date: true,
        startTime: true,
        endTime: true,
        taskUser: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
      },
    });
    return tasks;
  } catch (error) {
    console.error(`Error fetching tasks`, error);
    throw new Error(`Failed to get tasks`);
  }
}
