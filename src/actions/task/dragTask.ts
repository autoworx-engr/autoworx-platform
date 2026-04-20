"use server";

import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { Task } from "@prisma/client";
import { revalidatePath } from "next/cache";
import createGoogleCalendarEvent from "./google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "./google-calendar/updateGoogleCalendarEvent";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

type TTask = {
  id: number;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
};

/**
 * `preserveTime`: when true, keeps the task's existing startTime/endTime if already set
 * (used by month-view drag-and-drop which only moves the date, not the time slot).
 */
export async function updateTask(
  task: TTask,
  { preserveTime = false }: { preserveTime?: boolean } = {},
): Promise<ServerAction> {
  try {
    let startTime = task.startTime;
    let endTime = task.endTime;

    if (preserveTime) {
      const existing = await db.task.findUnique({ where: { id: task.id } });
      startTime = existing?.startTime ?? task.startTime;
      endTime = existing?.endTime ?? task.endTime;
      revalidatePath("/task");
    }

    let updatedTask = await db.task.update({
      where: { id: task.id },
      data: {
        date: new Date(task.date),
        startTime,
        endTime,
      },
    });

    try {
      await handleDragEventForGoogleCalendar(updatedTask);
    } catch (error) {
      console.log("🚀 ~ updateTask ~ error:", error);
    }

    return {
      type: "success",
      data: updatedTask,
    };
  } catch (error) {
    return {
      type: "error",
    };
  }
}

async function handleDragEventForGoogleCalendar(updatedTask: Task) {
  const googleCalendarToken = (await getGoogleCalendarToken())
    ?.googleCalendarToken;

  if (
    !googleCalendarToken ||
    !updatedTask.startTime ||
    !updatedTask.endTime ||
    !updatedTask.date ||
    !updatedTask.title ||
    !updatedTask.description
  )
    return;

  const taskForGoogleCalendar = {
    title: updatedTask.title,
    description: updatedTask.description,
    assignedUsers: [] as never[],
    priority: updatedTask.priority,
    startTime: updatedTask.startTime,
    endTime: updatedTask.endTime,
    date: new Date(updatedTask.date).toISOString(),
  };

  if (updatedTask.googleEventId) {
    await updateGoogleCalendarEvent(
      updatedTask.googleEventId,
      taskForGoogleCalendar,
    );
  } else {
    let event = await createGoogleCalendarEvent(taskForGoogleCalendar);

    if (event && event.id) {
      await db.task.update({
        where: { id: updatedTask.id },
        data: { googleEventId: event.id },
      });
    }
  }
}
