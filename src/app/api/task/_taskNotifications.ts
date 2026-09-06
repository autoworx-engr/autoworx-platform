import { db } from "@/lib/db";
import {
  sendNewTaskAssignNotification,
  sendTaskCompleteNotification,
} from "@/lib/notification/task-and-appointment-notify";
import { TaskStatus } from "@prisma/client";

export type TaskNotifySnapshot = {
  status: TaskStatus;
  assignedUserIds: number[];
};

export async function getTaskNotifySnapshot(
  taskId: number,
): Promise<TaskNotifySnapshot> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { status: true, taskUser: { select: { userId: true } } },
  });

  return {
    status: task?.status ?? "pending",
    assignedUserIds: task?.taskUser.map((row) => row.userId) ?? [],
  };
}

type NotifyArgs = {
  taskId: number;
  companyId: number;
  title: string;
  date: Date | null;
  status: TaskStatus;
  before: TaskNotifySnapshot;
};

export async function notifyTaskUpdated({
  taskId,
  companyId,
  title,
  date,
  status,
  before,
}: NotifyArgs): Promise<void> {
  try {
    const assignedUserIds = (
      await db.taskUser.findMany({
        where: { taskId },
        select: { userId: true },
      })
    ).map((row) => row.userId);

    const previouslyAssigned = new Set(before.assignedUserIds);
    const newlyAssigned = assignedUserIds.filter(
      (userId) => !previouslyAssigned.has(userId),
    );

    if (newlyAssigned.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: newlyAssigned }, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
          phone: true,
        },
      });

      await Promise.all(
        users.map((user) =>
          sendNewTaskAssignNotification({
            taskTitle: title,
            taskDate: date?.toISOString(),
            assignTaskUser: user,
          }),
        ),
      );
    }

    if (status === "completed" && before.status !== "completed") {
      await sendTaskCompleteNotification({
        companyId,
        taskTitle: title,
        taskDate: date,
        assignTaskUserId: assignedUserIds,
      });
    }
  } catch (error) {
    console.error("notifyTaskUpdated failed", error);
  }
}
