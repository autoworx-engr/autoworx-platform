"use server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export default async function getAppointmentById(
  appointmentId: number,
  params?: Omit<Prisma.AppointmentFindUniqueArgs, "where">,
) {
  try {
    if (!appointmentId) {
      throw new Error("Appointment ID is required");
    }
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      ...params,
    });
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    const [confirmationEmailTemplate, reminderEmailTemplate] =
      await Promise.all([
        appointment.confirmationEmailTemplateId
          ? db.emailTemplate.findUnique({
              where: { id: appointment.confirmationEmailTemplateId },
            })
          : Promise.resolve(null),
        appointment.reminderEmailTemplateId
          ? db.emailTemplate.findUnique({
              where: { id: appointment.reminderEmailTemplateId },
            })
          : Promise.resolve(null),
      ]);
    return { ...appointment, confirmationEmailTemplate, reminderEmailTemplate };
  } catch (error) {
    console.error(`Error fetching appointment by ID`, error);
    throw error;
  }
}
