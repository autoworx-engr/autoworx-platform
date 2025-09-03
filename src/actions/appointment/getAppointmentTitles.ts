"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";

export async function getAppointmentTitles() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to fetch appointment titles",
    };
  }

  try {
    const appointmentTitles = await db.appointment_titles.findMany({
      where: {
        company_id: session.user.companyId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      type: "success" as const,
      data: appointmentTitles,
    };
  } catch (error) {
    console.error("Error fetching appointment titles:", error);
    return {
      type: "error" as const,
      message: "Failed to fetch appointment titles",
    };
  }
}
