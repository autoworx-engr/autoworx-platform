
"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

type UpdateBookingAppointmentTitleData = {
  id: number;
  title: string;
};

export async function updateBookingAppointmentTitle(
  data: UpdateBookingAppointmentTitleData
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to update an appointment title",
    };
  }

  const { id, title } = data;

  if (!title || !title.trim()) {
    return {
      type: "error" as const,
      message: "Appointment title is required",
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

    // Check for duplicate title
    const duplicate = await db.bookingAppointmentTitle.findFirst({
      where: {
        title: title.trim(),
        NOT: { id },
      },
    });

    if (duplicate) {
      return {
        type: "error" as const,
        message: "An appointment title with this name already exists",
      };
    }

    const updated = await db.bookingAppointmentTitle.update({
      where: { id },
      data: { title: title.trim() },
    });

    return {
      type: "success" as const,
      data: updated,
      message: "Appointment title updated successfully",
    };
  } catch (error) {
    console.error("Error updating booking appointment title:", error);
    return {
      type: "error" as const,
      message: "Failed to update appointment title",
    };
  }
}