"use server";

import { db } from "@/lib/db";

export async function deleteHoliday(holidayId: number) {
  try {
    const holiday = await db.holiday.findUnique({
      where: { id: holidayId },
    });

    // Already gone (e.g. double-click / stale id) — treat as success so the
    // UI stays consistent instead of throwing a Server Component render error.
    if (!holiday) {
      return { status: 200, data: null };
    }

    await db.holiday.delete({ where: { id: holidayId } });

    return { status: 200, data: holiday };
  } catch (err: any) {
    // Return the error instead of throwing, so it surfaces as a toast on the
    // client rather than an uncaught Server Components render error.
    return {
      status: 500,
      data: null,
      error: `Failed to delete holiday: ${err?.message ?? err}`,
    };
  }
}
