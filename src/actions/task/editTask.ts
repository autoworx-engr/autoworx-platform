"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { Priority } from "@prisma/client";
import { google } from "googleapis";
import { env } from "next-runtime-env";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { AppointmentToAdd } from "../appointment/addAppointment";
import { AppointmentToUpdate } from "../appointment/editAppointment";

import createGoogleCalendarEvent from "./google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "./google-calendar/updateGoogleCalendarEvent";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateTaskValidationSchema,
  updateTaskValidationSchema,
} from "@/validations/schemas/task/task.validation";
import { getGoogleCalendarToken } from "@/app/(dashboard)/dashboard/task/[type]/components/appointment/googleCalendarAuth";

interface TaskType {
  title: string;
  description: string;
  assignedUsers: number[];
  priority: Priority;
  startTime?: string;
  endTime?: string;
  date?: string;
  timezone: string;
}

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

    // Remove the users
    for (const user of toRemove) {
      // TODO: Remove the task from the user's Google Calendar

      await db.taskUser.delete({
        where: {
          id: user.id,
        },
      });
    }

    if (Array.isArray(toAdd)) {
      // Add the users
      for (const user of toAdd) {
        // TODO: Add the task to the user's Google Calendar

        // Create the task user
        await db.taskUser.create({
          data: {
            taskId: id,
            userId: user,
            eventId: "null-for-now",
          },
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
          await db.task.update({
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

    revalidatePath("/task");
    revalidatePath("/communication/client");

    return {
      type: "success",
    };
  } catch (error) {
    console.log("🚀 ~ error updating:", error);
    return errorHandler(error);
  }
}
