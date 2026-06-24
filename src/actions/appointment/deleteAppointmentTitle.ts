"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";

type DeleteAppointmentTitleData = {
  id: number;
};

export async function deleteAppointmentTitle(data: DeleteAppointmentTitleData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to delete appointment titles",
    };
  }

  const id = Number(data?.id);

  if (!id || Number.isNaN(id)) {
    return {
      type: "error" as const,
      message: "A valid appointment title id is required",
    };
  }

  try {
    // Only allow deleting a title that belongs to the user's own company
    const existingTitle = await db.appointmentTitle.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!existingTitle) {
      return {
        type: "error" as const,
        message: "Appointment title not found",
      };
    }

    await db.appointmentTitle.delete({
      where: { id: existingTitle.id },
    });

    return {
      type: "success" as const,
      data: existingTitle,
      message: "Appointment title deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting appointment title:", error);
    return {
      type: "error" as const,
      message: "Failed to delete appointment title",
    };
  }
}
