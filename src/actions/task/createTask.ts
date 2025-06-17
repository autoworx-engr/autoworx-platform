"use server";

import { getGoogleCalendarToken } from "@/app/(dashboard)/dashboard/task/[type]/components/appointment/googleCalendarAuth";
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

export interface TaskType {
  title: string;
  description?: string;
  assignedUsers: number[];
  priority: Priority;
  invoiceId?: string;
  startTime?: string | null;
  endTime?: string | null;
  clientId?: number | null;
  date?: string;
  timezone?: string;
}

export async function createTask(
  task: TCreateTaskValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  // console.log("🚀 ~ task:", task);
  try {
    // Validate task data
    await createTaskValidationSchema.parseAsync(task);

    const session = await getServerSession(authOptions);

    if (!session) {
      throw new Error("session is required");
    }

    let client;

    if (task.clientId) {
      client = await db.client.findFirst({
        where: {
          id: task.clientId,
        },
        include: {
          Lead: {
            select: {
              id: true,
              columnId: true,
            },
          },
        },
      });
    }

    let taskData = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      userId: parseInt(session.user.id),
      companyId: session.user.companyId,
      invoiceId: task.invoiceId,
      startTime: task.startTime,
      endTime: task.endTime,
      clientId: task.clientId,
      leadId: task.leadId,
      date: task?.date || undefined,
    };

    let newTask = await db.task.create({
      data: taskData,
    });

    // Loop the assigned users and add them to the Google Calendar
    for (const user of task.assignedUsers) {
      const assignedUser = await db.user.findUnique({
        where: {
          id: user,
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
      if (assignedUser) {
        sendNewTaskAssignNotification({
          taskTitle: task.title,
          taskDate: task.date,
          assignTaskUser: assignedUser,
        });
      }

      // TODO: Add the task to the user's Google Calendar

      // Create the task user
      await db.taskUser.create({
        data: {
          taskId: newTask.id,
          userId: user,
          eventId: "null-for-now",
        },
      });
    }

    revalidatePath("/task");
    revalidatePath("/communication/client");

    // if the task has date, start time and end time, then insert it in google calendar
    // also need to check if google calendar token exists or not, if not, then no need of inserting
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

    return {
      type: "success",
      data: newTask,
    };
  } catch (error) {
    return errorHandler(error);
  }
}
