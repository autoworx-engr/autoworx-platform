"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendNewTaskAssignNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  createTaskValidationSchema,
  TCreateTaskValidationSchema,
} from "@/validations/schemas/task/task.validation";
import { Priority } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import createGoogleCalendarEvent from "./google-calendar/createGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

export interface TaskType {
  title: string;
  description?: string;
  assignedUsers: number[];
  priority: Priority;
  invoiceId?: string;
  invoiceTemplateId?: string;
  startTime?: string | null;
  endTime?: string | null;
  clientId?: number | null;
  date?: string;
  timezone?: string;
  createdBy?: "user" | "sales_agent";
}

export async function createTask(
  task: TCreateTaskValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    // Validate task data
    await createTaskValidationSchema.parseAsync(task);

    const session = await getServerSession(authOptions);

    if (!session) {
      throw new Error("session is required");
    }

    let taskData = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      userId: parseInt(session.user.id),
      companyId: session.user.companyId,
      invoiceId: task.invoiceId,
      invoiceTemplateId: task?.invoiceTemplateId,
      startTime: task.startTime,
      endTime: task.endTime,
      clientId: task.clientId,
      leadId: task.leadId ?? null,
      date: task?.date || undefined,
      createdBy: task?.createdBy,
    };

    let newTask = await db.task.create({
      data: taskData,
    });

    if (task.assignedUsers.length > 0) {
      const assignedUsers = await db.user.findMany({
        where: {
          id: { in: task.assignedUsers },
          companyId: session.user.companyId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
          phone: true,
        },
      });
      const userMap = new Map(assignedUsers.map((u) => [u.id, u]));

      await db.taskUser.createMany({
        data: task.assignedUsers.map((userId) => ({
          taskId: newTask.id,
          userId,
          eventId: null,
        })),
      });

      for (const userId of task.assignedUsers) {
        const assignedUser = userMap.get(userId);
        if (assignedUser) {
          sendNewTaskAssignNotification({
            taskTitle: task.title,
            taskDate: task.date,
            assignTaskUser: assignedUser,
          });
        }
      }
    }

    try {
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (googleCalendarToken && task.startTime && task.endTime && task.date) {
        let event = await createGoogleCalendarEvent(task);

        // if event is successfully created in google calendar, then save the event id in task model
        if (event && event.id) {
          newTask = await db.task.update({
            where: {
              id: newTask.id,
            },
            data: {
              googleEventId: event.id,
            },
          });
        }
      }
    } catch (error) {
      console.log("🚀 ~ error:", error);
    }

    revalidatePath("/dashboard/communication/client/${clientId}");
    return {
      type: "success",
      data: newTask,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
