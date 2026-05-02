"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { sendNewTaskAssignNotification } from "@/lib/notification/task-and-appointment-notify";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateTaskValidationSchema,
  updateTaskValidationSchema,
} from "@/validations/schemas/task/task.validation";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import createGoogleCalendarEvent from "./google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "./google-calendar/updateGoogleCalendarEvent";
import { revalidatePath } from "next/cache";

export async function editTask({
  id,
  task,
}: TUpdateTaskValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    await updateTaskValidationSchema.parseAsync({ id, task });
    // await
    // Find the task users
    const taskUsers = await db.taskUser.findMany({
      where: {
        taskId: id,
      },
    });

    const assignedUsers = task.assignedUsers;

    // Find the difference between the existing users and the new users
    const toRemove = taskUsers.filter(
      (taskUser) => !assignedUsers?.includes(taskUser.userId),
    );
    const toAdd = assignedUsers?.filter(
      (userId) => !taskUsers.find((taskUser) => taskUser.userId === userId),
    );

    await db.$transaction([
      ...toRemove.map((user) => db.taskUser.delete({ where: { id: user.id } })),
      ...(Array.isArray(toAdd) && toAdd.length > 0
        ? [
            db.taskUser.createMany({
              data: toAdd.map((userId) => ({
                taskId: id,
                userId,
                eventId: null,
              })),
            }),
          ]
        : []),
    ]);

    if (Array.isArray(toAdd) && toAdd.length > 0) {
      const addedUsers = await db.user.findMany({
        where: { id: { in: toAdd } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
          phone: true,
        },
      });
      for (const assignedUser of addedUsers) {
        sendNewTaskAssignNotification({
          taskTitle: task.title,
          taskDate: task.date,
          assignTaskUser: assignedUser,
        });
      }
    }

    // Update the task
    let updatedTask = await db.task.update({
      where: {
        id,
      },
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        startTime: task.startTime,
        endTime: task.endTime,
        date: task.date,
      },
    });

    // if the task has date, start time and end time, then insert it in google calendar
    // also need to check if google calendar token exists or not, if not, then no need of inserting
    try {
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (
        googleCalendarToken &&
        updatedTask.googleEventId &&
        updatedTask.startTime &&
        updatedTask.endTime &&
        updatedTask.date
      ) {
        await updateGoogleCalendarEvent(updatedTask.googleEventId, task);
      } else if (
        googleCalendarToken &&
        !updatedTask.googleEventId &&
        updatedTask.startTime &&
        updatedTask.endTime &&
        updatedTask.date
      ) {
        let event = await createGoogleCalendarEvent(task);

        // if event is successfully created in google calendar, then save the event id in task model
        if (event && event.id) {
          updatedTask = await db.task.update({
            where: {
              id: updatedTask.id,
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
      data: updatedTask,
    };
  } catch (error) {
    console.log("🚀 ~ error updating:", error);
    return errorHandler(error);
  }
}
