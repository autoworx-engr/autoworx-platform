"use server";
import { db } from "@/lib/db";

export async function getClientTask(clientId: number, companyId: number) {
  try {
    const task = await db.task.findMany({
      where: {
        companyId,
        clientId,
      },
    });
    return task;
  } catch (err) {
    throw err;
  }
}
