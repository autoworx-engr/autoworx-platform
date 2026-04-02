
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";

export async function deleteBookingAppointmentTitle(id: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to delete an appointment title",
    };
  }

  try {
    const existing = await db.bookingAppointmentTitle.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      return {
        type: "error" as const,
        message: "Appointment title not found",
      };
    }

    await db.bookingAppointmentTitle.delete({
      where: { id },
    });

    return {
      type: "success" as const,
      message: "Appointment title deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting booking appointment title:", error);
    return {
      type: "error" as const,
      message: "Failed to delete appointment title",
    };
  }
}