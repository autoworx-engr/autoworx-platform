"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  createAppointmentValidationSchema,
  TCreateAppointmentValidationSchema,
} from "@/validations/schemas/task/appointment.validation";
import { authOptions } from "@/authOptions";
import { sendNewAppointmentNotification } from "@/lib/notification/task-and-appointment-notify";
import { Client, Lead } from "@prisma/client";
import { getServerSession } from "next-auth";
import { sendAppointmentConfirmation } from "./appointmentNotifications";
import { scheduleRemindersInNest } from "./appointmentReminderScheduler";
import { syncAppointmentToGoogleCalendar } from "./appointmentCalendarSync";

export interface AppointmentToAdd {
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  assignedUsers: number[];
  clientId?: number;
  vehicleId?: number;
  serviceCategoryId?: number;
  draftEstimate: string | null;
  notes?: string;
  confirmationEmailTemplateId?: number;
  reminderEmailTemplateId?: number;
  confirmationEmailTemplateStatus?: boolean;
  reminderEmailTemplateStatus?: boolean;
  times?: { date: string; time: string }[];
  timezone?: string;
}

export async function addAppointment(
  appointment: TCreateAppointmentValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    await createAppointmentValidationSchema.parseAsync(appointment);
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user.id;

    let companyId = appointment.forceCompanyId;
    let userId = appointment.forceUserId ?? sessionUserId;

    if (!userId) {
      return { type: "error", message: "User not found", field: "user" };
    }
    if (!companyId) {
      companyId = session?.user?.companyId;
      if (!companyId) {
        throw new Error("Company ID is required to create an appointment.");
      }
    }

    let client: (Client & { Lead: Lead | null }) | null = null;

    if (appointment.clientId) {
      client = await db.client.findFirst({
        where: { id: appointment.clientId },
        include: { Lead: true },
      });
    }

    if (!appointment.title) {
      return { type: "error", message: "Title is required", field: "title" };
    }

    let newAppointment = await db.appointment.create({
      data: {
        title: appointment.title,
        date: appointment.date ? new Date(appointment.date) : undefined,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        clientId: appointment.clientId,
        vehicleId: appointment.vehicleId,
        serviceCategoryId: appointment.serviceCategoryId,
        draftEstimate: appointment.draftEstimate,
        notes: appointment.notes,
        userId: Number(userId),
        confirmationEmailTemplateId: appointment.confirmationEmailTemplateId,
        confirmationEmailTemplateStatus:
          appointment.confirmationEmailTemplateStatus,
        reminderEmailTemplateId: appointment.reminderEmailTemplateId,
        reminderEmailTemplateStatus: appointment.reminderEmailTemplateStatus,
        times: appointment.times,
        companyId,
        timezone: appointment.timezone,
      },
    });

    if (appointment.assignedUsers.length > 0) {
      await db.appointmentUser.createMany({
        data: appointment.assignedUsers.map((uid) => ({
          appointmentId: newAppointment.id,
          userId: uid,
          eventId: null,
        })),
      });
    }

    // TODO: use `createDraftEstimate` action
    if (appointment.draftEstimate) {
      const draftEstimate = await db.invoice.findFirst({
        where: { id: appointment.draftEstimate },
      });

      const pendingColumn = await db.column.findFirst({
        where: { title: "Pending", companyId },
      });

      if (!pendingColumn) {
        throw new Error(
          "Pending column not found for draft estimate at new appointment",
        );
      }

      if (!draftEstimate) {
        await db.invoice.create({
          data: {
            id: appointment.draftEstimate,
            type: "Estimate",
            clientId: appointment.clientId,
            vehicleId: appointment.vehicleId,
            userId: Number(userId),
            companyId,
            columnId: pendingColumn.id,
          },
        });

        if (client?.Lead?.id) {
          await db.lead.update({
            where: { id: client.Lead.id },
            data: { isEstimateCreated: true },
          });
        }
      }
    }

    const vehicle = await db.vehicle.findFirst({
      where: { id: appointment.vehicleId },
    });

    const company = await db.company.findFirst({
      where: { id: client?.companyId },
      select: {
        timezone: true,
        name: true,
        address: true,
        phone: true,
        smsGateway: true,
      },
    });

    const confirmationEmailTemplate = await db.emailTemplate.findFirst({
      where: { id: appointment.confirmationEmailTemplateId },
    });

    await sendAppointmentConfirmation({
      client,
      vehicle,
      company,
      confirmationEmailTemplate,
      confirmationEmailTemplateStatus:
        appointment.confirmationEmailTemplateStatus ?? false,
      appointmentDate: appointment.date,
      appointmentStartTime: appointment.startTime,
    });

    if (appointment.reminderEmailTemplateStatus && appointment.times) {
      if (newAppointment.date && newAppointment.startTime) {
        let i = 0;
        for (const time of appointment.times) {
          await scheduleRemindersInNest({
            id: newAppointment.id.toString(),
            date: new Date(`${time.date}T00:00:00.000Z`),
            time: time.time,
            timezone: company?.timezone || appointment.timezone || "Etc/UTC",
            when: "exact",
            reminderIndex: i++,
          });
        }
      }
    }

    try {
      newAppointment.date &&
        newAppointment.startTime &&
        scheduleRemindersInNest({
          id: newAppointment.id.toString(),
          date: newAppointment.date,
          time: newAppointment.startTime,
          timezone: company?.timezone || newAppointment.timezone || "Etc/UTC",
        });
    } catch (error) {
      console.log("🚀 ~ error:", error);
    }

    await syncAppointmentToGoogleCalendar(newAppointment.id, appointment);

    try {
      sendNewAppointmentNotification({
        companyId,
        clientName: client ? `${client.firstName} ${client.lastName}` : "",
        title: appointment.title,
        appointmentDate: appointment.date || "",
        startTime: appointment.startTime || "",
        assignSalesIds: appointment.assignedUsers,
      });
    } catch (error) {
      console.log("🚀 ~ addAppointment ~ error:", error);
    }

    return { type: "success", data: newAppointment };
  } catch (error) {
    console.error("error from addAppointment", error);
    return errorHandler(error);
  }
}
