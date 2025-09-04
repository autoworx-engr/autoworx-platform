"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";

type CreateAppointmentTitleData = {
  name: string;
};

export async function createAppointmentTitle(data: CreateAppointmentTitleData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      type: "error" as const,
      message: "You must be logged in to create appointment titles",
    };
  }

  const { name } = data;

  if (!name || !name.trim()) {
    return {
      type: "error" as const,
      message: "Appointment title name is required",
    };
  }

  try {
    // Check if appointment title already exists for this company
    const existingTitle = await db.appointmentTitle.findFirst({
      where: {
        name: name.trim(),
        companyId: session.user.companyId,
      },
    });

    if (existingTitle) {
      return {
        type: "error" as const,
        message: "Appointment title already exists",
      };
    }

    const appointmentTitle = await db.appointmentTitle.create({
      data: {
        name: name.trim(),
        companyId: session.user.companyId,
      },
    });

    return {
      type: "success" as const,
      data: appointmentTitle,
      message: "Appointment title created successfully",
    };
  } catch (error) {
    console.error("Error creating appointment title:", error);
    return {
      type: "error" as const,
      message: "Failed to create appointment title",
    };
  }
}
