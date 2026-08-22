"use server";
import axios from "axios";

export async function scheduleRemindersInNest({
  id,
  date,
  time,
  timezone,
  when,
  reminderIndex,
}: {
  id: string;
  date: Date;
  time: string;
  timezone: string;
  when?: string;
  reminderIndex?: number;
}) {
  try {
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/reminder/schedule`,
      { id, date, time, timezone, when, reminderIndex },
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.log("error from scheduleRemindersInNest", error);
  }
}
