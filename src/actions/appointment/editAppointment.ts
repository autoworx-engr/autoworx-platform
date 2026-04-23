"use server";
import { Client } from "@prisma/client";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendAppointmentUpdateNotification } from "@/lib/notification/task-and-appointment-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  TUpdateAppointmentValidationSchema,
  updateAppointmentValidationSchema,
} from "@/validations/schemas/task/appointment.validation";
import moment from "moment";
import { getServerSession } from "next-auth";
// import { revalidatePath } from "next/cache";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "../task/google-calendar/updateGoogleCalendarEvent";
import { scheduleRemindersInNest } from "./appointmentReminderScheduler";
import { deleteRemindersInNest } from "./deleteAppointment";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";

export interface AppointmentToUpdate {
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  assignedUsers: number[];
  clientId?: number;
  vehicleId?: number;
  serviceCategoryId?: number;
  draftEstimate?: string | null;
  notes?: string;
  confirmationEmailTemplateId?: number;
  reminderEmailTemplateId?: number;
  confirmationEmailTemplateStatus?: boolean;
  reminderEmailTemplateStatus?: boolean;
  times?: { date: string; time: string }[];
  timezone?: string;
}

export async function editAppointment({
  id,
  appointment,
}: TUpdateAppointmentValidationSchema): Promise<ServerAction | TErrorHandler> {
  try {
    await updateAppointmentValidationSchema.parseAsync({ id, appointment });
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
    }

    if (appointment.draftEstimate) {
      // Check if the draftEstimate is same as the previous one
      const existingAppointment = await db.appointment.findUnique({
        where: {
          id,
        },
      });
      console.log(
        "🚀 ~ editAppointment ~ existingAppointment:",
        existingAppointment,
      );

      if (existingAppointment?.draftEstimate !== appointment.draftEstimate) {
        // Create draft estimate (if doesn't exist)
        const draftEstimate = await db.invoice.findFirst({
          where: {
            id: appointment.draftEstimate,
          },
        });
        console.log("🚀 ~ editAppointment ~ draftEstimate:", draftEstimate);

        if (!draftEstimate) {
          await db.invoice.create({
            data: {
              id: appointment.draftEstimate,
              type: "Estimate",
              clientId: appointment.clientId,
              vehicleId: appointment.vehicleId,
              userId: Number(session.user.id),
              companyId,
            },
          });
        }
      }
    }

    // Update the appointment
    let updatedAppointment = await db.appointment.update({
      where: {
        id,
      },
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
        confirmationEmailTemplateId: appointment.confirmationEmailTemplateId,
        confirmationEmailTemplateStatus:
          appointment.confirmationEmailTemplateStatus,
        reminderEmailTemplateId: appointment.reminderEmailTemplateId,
        reminderEmailTemplateStatus: appointment.reminderEmailTemplateStatus,
        times: appointment.times,
        timezone: appointment.timezone,
      },
    });
    console.log(
      "🚀 ~ editAppointment ~ updatedAppointment:",
      updatedAppointment,
    );

    // Delete all the assigned users for the appointment
    await db.appointmentUser.deleteMany({
      where: {
        appointmentId: id,
      },
    });

    if (appointment.assignedUsers.length > 0) {
      await db.appointmentUser.createMany({
        data: appointment.assignedUsers.map((userId) => ({
          appointmentId: id,
          userId,
          eventId: null,
        })),
      });
    }

    // get the confirmation email template
    const confirmationEmailTemplate = await db.emailTemplate.findFirst({
      where: {
        id: appointment.confirmationEmailTemplateId,
      },
    });
    const vehicle = await db.vehicle.findFirst({
      where: {
        id: appointment?.vehicleId,
      },
    });

    let client: Client | null = null;
    if (appointment.clientId) {
      client = await db.client.findFirst({
        where: {
          id: appointment.clientId,
        },
      });
    }

    const company = await db.company.findFirst({
      where: {
        id: companyId,
      },
      select: {
        timezone: true,
        name: true,
        address: true,
        phone: true,
        smsGateway: true,
      },
    });

    if (confirmationEmailTemplate) {
      const appointmentDate = moment(
        `${appointment.date}T${appointment.startTime}:00`,
      ).format("dddd, MMMM DD, h:mm A");
      let confirmationSubject = confirmationEmailTemplate?.subject || "";
      let confirmationMessage = confirmationEmailTemplate?.message || "";

      // replace the placeholders: <VEHICLE>, <CLIENT>
      confirmationSubject = confirmationSubject?.replace(
        "<VEHICLE>",
        vehicle ? vehicle.model! : "",
      );
      confirmationSubject = confirmationSubject?.replace(
        "<CLIENT>",
        client ? client.firstName + " " + client.lastName : "",
      );

      confirmationMessage = confirmationMessage?.replace(
        "<VEHICLE>",
        vehicle ? vehicle.model! : "",
      );
      confirmationMessage = confirmationMessage?.replace(
        "<CLIENT>",
        client ? client.firstName + " " + client.lastName : "",
      );

      confirmationMessage = confirmationMessage?.replace(
        "<DATE>",
        appointmentDate,
      );

      confirmationMessage = confirmationMessage?.replace(
        "<BUSINESS_NAME>",
        company?.name ?? "",
      );

      confirmationMessage = confirmationMessage?.replace(
        "<ADDRESS>",
        company?.address ?? "",
      );

      confirmationMessage = confirmationMessage?.replace(
        "<PHONE>",
        company?.phone ?? "",
      );

      // send the confirmation email
      if (appointment.confirmationEmailTemplateStatus) {
        // send email
        if (client) {
          try {
            sendInfobipEmail({
              clientId: client.id,
              subject: confirmationSubject,
              text: confirmationMessage,
            });
            if (company?.smsGateway === "TWILIO") {
              await sendTwilioMessage({
                clientId: client.id,
                message: confirmationMessage,
                attachments: [],
              });
            } else if (company?.smsGateway === "INFOBIP") {
              await sendInfobipMessage({
                clientId: client.id,
                message: confirmationMessage,
                attachments: [],
              });
            }
          } catch (error) {
            console.log("🚀 ~ error:", error);
          }
        }
      }
    }
    const reminderTemplate = await db.emailTemplate.findFirst({
      where: {
        id: appointment.reminderEmailTemplateId,
      },
    });

    try {
      await deleteRemindersInNest(String(updatedAppointment.id));
    } catch (error) {
      console.log("🚀 ~ editAppointment ~ error:", error);
    }

    if (updatedAppointment.date && updatedAppointment.startTime) {
      let i = 0;
      for (const time of appointment?.times ?? []) {
        try {
          await scheduleRemindersInNest({
            id: updatedAppointment.id.toString(),
            date: new Date(`${time.date}T00:00:00.000Z`),
            time: time.time,
            timezone: company?.timezone || appointment?.timezone || "Etc/UTC",
            when: "exact",
            reminderIndex: i++,
          });
        } catch (error) {
          console.log("🚀 ~ editAppointment ~ error:", error);
        }
      }
    }

    try {
      updatedAppointment.date &&
        updatedAppointment.startTime &&
        (await scheduleRemindersInNest({
          id: updatedAppointment.id.toString(),
          date: updatedAppointment.date, // e.g., "2025-07-20"
          time: updatedAppointment.startTime, // e.g., "15:00"
          timezone:
            company?.timezone || updatedAppointment.timezone || "Etc/UTC",
        }));
    } catch (error) {
      console.log("🚀 ~ error:", error);
    }

    try {
      // if the appointment has date, start time and end time, then insert it in google calendar
      // also need to check if google calendar token exists or not, if not, then no need of inserting
      let googleCalendarToken = (await getGoogleCalendarToken())
        ?.googleCalendarToken;

      if (
        googleCalendarToken &&
        updatedAppointment.googleEventId &&
        updatedAppointment.startTime &&
        updatedAppointment.endTime &&
        updatedAppointment.date
      ) {
        await updateGoogleCalendarEvent(
          updatedAppointment.googleEventId,
          appointment,
        );
      } else if (
        googleCalendarToken &&
        !updatedAppointment.googleEventId &&
        updatedAppointment.startTime &&
        updatedAppointment.endTime &&
        updatedAppointment.date
      ) {
        let event = await createGoogleCalendarEvent(appointment);

        // if event is successfully created in google calendar, then save the event id in task model
        if (event && event.id) {
          await db.appointment.update({
            where: {
              id: updatedAppointment.id,
            },
            data: {
              googleEventId: event.id,
            },
          });
        }
      }
    } catch (error) {
      console.log("🚀 ~ error:", error);
    }

    // send a notification when create a new appointment
    sendAppointmentUpdateNotification({
      companyId,
      title: appointment.title,
      appointmentDate: appointment?.date || "",
      startTime: appointment?.startTime || "",
      assignSalesIds: appointment.assignedUsers,
      clientName: client ? `${client?.firstName} ${client?.lastName}` : "",
    });

    // revalidatePath("/task");
    return {
      type: "success",
      data: updatedAppointment,
    };
  } catch (error) {
    console.log("🚀 ~ error:", error);
    return errorHandler(error);
  }
}
