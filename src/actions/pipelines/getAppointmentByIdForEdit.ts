"use server";
import { db } from "@/lib/db";
import { AppointmentFull } from "@/types/db";
import {
  CalendarSettings,
  Client,
  EmailTemplate,
  User,
  Vehicle,
} from "@prisma/client";

type TGetAppointmentByIdForEdit = AppointmentFull & {
  extra: {
    employees: User[];
    customers: Client[];
    vehicles: Vehicle[];
    emailTemplates: EmailTemplate[];
    settings: CalendarSettings;
  };
};

export async function getAppointmentByIdForEdit(
  appointmentId?: number,
): Promise<TGetAppointmentByIdForEdit> {
  try {
    if (!appointmentId) {
      throw new Error("Appointment ID is required");
    }
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        client: true,
        vehicle: true,
        appointmentUsers: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Run all the independent database queries in parallel
    const [
      confirmationEmailTemplate,
      reminderEmailTemplate,
      employees,
      customers,
      vehicles,
      emailTemplates,
      settings,
    ] = await Promise.all([
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
      db.user.findMany({
        where: {
          companyId: appointment.companyId,
        },
      }),
      db.client.findMany({
        where: { companyId: appointment.companyId },
      }),
      db.vehicle.findMany({
        where: { companyId: appointment.companyId },
      }),
      db.emailTemplate.findMany({
        where: {
          companyId: appointment.companyId,
        },
      }),
      db.calendarSettings.findFirst({
        where: {
          companyId: appointment.companyId,
        },
      }) as Promise<CalendarSettings>,
    ]);

    return {
      ...appointment,
      times: appointment.times as string[],
      confirmationEmailTemplate: confirmationEmailTemplate as any,
      reminderEmailTemplate: reminderEmailTemplate as any,
      assignedUsers: appointment.appointmentUsers.map(
        (appointmentUser) => appointmentUser.user,
      ),
      extra: {
        employees,
        customers,
        vehicles,
        emailTemplates,
        settings,
      },
    };
  } catch (error) {
    throw error;
  }
}
