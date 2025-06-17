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

    const confirmationEmailTemplate = appointment.confirmationEmailTemplateId
      ? await db.emailTemplate.findUnique({
          where: { id: appointment.confirmationEmailTemplateId },
        })
      : null;

    const reminderEmailTemplate = appointment.reminderEmailTemplateId
      ? await db.emailTemplate.findUnique({
          where: { id: appointment.reminderEmailTemplateId },
        })
      : null;
    const employees = await db.user.findMany({
      where: {
        companyId: appointment.companyId,
      },
    });

    const customers = await db.client.findMany({
      where: { companyId: appointment.companyId },
    });

    const vehicles = await db.vehicle.findMany({
      where: { companyId: appointment.companyId },
    });

    const emailTemplates = await db.emailTemplate.findMany({
      where: {
        companyId: appointment.companyId,
      },
    });

    const settings = (await db.calendarSettings.findFirst({
      where: {
        companyId: appointment.companyId,
      },
    })) as CalendarSettings;

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
