"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";

type CreateBookingAppointmentTitleData = {
  title: string;
};

export async function createBookingAppointmentTitle(
  data: CreateBookingAppointmentTitleData
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to create an appointment title",
    };
  }

  const { title } = data;

  if (!title || !title.trim()) {
    return {
      type: "error" as const,
      message: "Appointment title is required",
    };
  }

  try {
    const existingTitle = await db.bookingAppointmentTitle.findFirst({
      where: {
        title: title.trim(),
      },
    });

    if (existingTitle) {
      return {
        type: "error" as const,
        message: "This appointment title already exists",
      };
    }

    const appointmentTitle = await db.bookingAppointmentTitle.create({
      data: {
        title: title.trim(),
      },
    });

    return {
      type: "success" as const,
      data: appointmentTitle,
      message: "Appointment title created successfully",
    };
  } catch (error) {
    console.error("Error creating booking appointment title:", error);
    return {
      type: "error" as const,
      message: "Failed to create appointment title",
    };
  }
}
