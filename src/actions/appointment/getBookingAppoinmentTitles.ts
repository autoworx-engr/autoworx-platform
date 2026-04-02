"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

export async function getBookingAppointmentTitles() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to fetch appointment titles",
    };
  }

  try {
    const appointmentTitles = await db.bookingAppointmentTitle.findMany({
     
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
       orderBy: {
        createdAt: "asc",
      },
    });

    return {
      type: "success" as const,
      data: appointmentTitles,
    };
  } catch (error) {
    console.error("Error fetching booking appointment titles:", error);
    return {
      type: "error" as const,
      message: "Failed to fetch appointment titles",
    };
  }
}
