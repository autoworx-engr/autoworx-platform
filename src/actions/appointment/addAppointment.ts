"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  createAppointmentValidationSchema,
  TCreateAppointmentValidationSchema,
} from "@/validations/schemas/task/appointment.validation";
import moment from "moment-timezone";
// import cron from "node-cron";
import { authOptions } from "@/authOptions";
import { sendNewAppointmentNotification } from "@/lib/notification/task-and-appointment-notify";
import { Client, Lead } from "@prisma/client";
import axios from "axios";
import { getServerSession } from "next-auth";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";

import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
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
      return {
        type: "error",
        message: "User not found",
        field: "user",
      };
    }
    if (!companyId) {
      companyId = session?.user?.companyId;
      if (!companyId) {
        throw new Error("Company ID is required to create an appointment.");
      }
    }

    let client:
      | (Client & {
          Lead: Lead | null;
        })
      | null = null;

    if (appointment.clientId) {
      client = await db.client.findFirst({
        where: {
          id: appointment.clientId,
        },
        include: {
          Lead: true,
        },
      });
    }

    if (!appointment.title) {
      return {
        type: "error",
        message: "Title is required",
        field: "title",
      };
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
        data: appointment.assignedUsers.map((userId) => ({
          appointmentId: newAppointment.id,
          userId,
          eventId: null,
        })),
      });
    }

    // TODO: use `createDraftEstimate` action
    // Create draft estimate (if doesn't exist)
    if (appointment.draftEstimate) {
      const draftEstimate = await db.invoice.findFirst({
        where: {
          id: appointment.draftEstimate,
        },
      });

      const pendingColumn = await db.column.findFirst({
        where: {
          title: "Pending",
          companyId: companyId,
        },
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
        //check the client is a lead or not.if then update the lead estimate created status

        if (client?.Lead?.id) {
          await db.lead.update({
            where: {
              id: client.Lead.id,
            },
            data: {
              isEstimateCreated: true,
            },
          });
        }
      }
    }

    // revalidatePath("/dashboard/task");

    const vehicle = await db.vehicle.findFirst({
      where: {
        id: appointment.vehicleId,
      },
    });

    const company = await db.company.findFirst({
      where: {
        id: client?.companyId,
      },
      select: {
        timezone: true,
        name: true,
        address: true,
        phone: true,
        smsGateway: true,
      },
    });

    // get the confirmation email template
    const confirmationEmailTemplate = await db.emailTemplate.findFirst({
      where: {
        id: appointment.confirmationEmailTemplateId,
      },
    });

    // get the reminder email template
    const reminderEmailTemplate = await db.emailTemplate.findFirst({
      where: {
        id: appointment.reminderEmailTemplateId,
      },
    });

    const appointmentDate = moment(
      `${appointment.date}T${appointment.startTime}:00`,
    ).format("dddd, MMMM DD, h:mm A");

    if (confirmationEmailTemplate) {
      let confirmationSubject = confirmationEmailTemplate?.subject || "";
      let confirmationMessage = confirmationEmailTemplate?.message || "";
      const clientName = client?.firstName || client?.lastName || "";

      // replace the placeholders: <VEHICLE>, <CLIENT>
      confirmationSubject = confirmationSubject?.replace(
        "<VEHICLE>",
        `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`,
      );
      confirmationSubject = confirmationSubject?.replace(
        "<CLIENT>",
        clientName,
      );

      confirmationMessage = confirmationMessage?.replace(
        "<VEHICLE>",
        `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`,
      );
      confirmationMessage = confirmationMessage?.replace(
        "<CLIENT>",
        clientName,
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
        "<PHONE>",
        company?.phone ?? "",
      );

      confirmationMessage = confirmationMessage?.replace(
        "<ADDRESS>",
        company?.address ?? "",
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
          } catch (error) {
            console.log("🚀 ~ error:", error);
          }
          try {
            if (company?.smsGateway === "TWILIO") {
              sendTwilioMessage({
                clientId: client.id,
                message: confirmationMessage,
                attachments: [],
              });
            } else if (company?.smsGateway === "INFOBIP") {
              sendInfobipMessage({
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

    // Scheduling reminder cron jobs
    if (appointment.reminderEmailTemplateStatus && appointment.times) {
      const vehicle = await db.vehicle.findFirst({
        where: {
          id: appointment.vehicleId,
        },
      });

      const reminderTemplate = await db.emailTemplate.findFirst({
        where: {
          id: appointment.reminderEmailTemplateId,
        },
      });

      if (newAppointment.date && newAppointment?.startTime) {
        let i = 0;

        for (const time of appointment.times) {
          scheduleRemindersInNest({
            id: newAppointment.id.toString(),
            date: new Date(`${time.date}T00:00:00.000Z`),
            time: time.time,
            timezone: company?.timezone || appointment?.timezone || "Etc/UTC",
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
          date: newAppointment.date, // e.g., "2025-07-20"
          time: newAppointment.startTime, // e.g., "15:00"
          timezone: company?.timezone || newAppointment.timezone || "Etc/UTC",
        });
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
        appointment.startTime &&
        appointment.endTime &&
        appointment.date
      ) {
        let event = await createGoogleCalendarEvent(appointment);

        // if event is successfully created in google calendar, then save the event id in task model
        if (event && event.id) {
          newAppointment = await db.appointment.update({
            where: {
              id: newAppointment.id,
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

    try {
      // send a notification when create a new appointment
      sendNewAppointmentNotification({
        companyId,
        clientName: client ? `${client?.firstName} ${client?.lastName}` : "",
        title: appointment.title,
        appointmentDate: appointment?.date || "",
        startTime: appointment?.startTime || "",
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
export async function scheduleRemindersInNest({
  id,
  date,
  time,
  timezone,
  when,
  reminderIndex,
}: {
  id: string;
  date: Date; // e.g., "2025-07-20"
  time: string; // e.g., "15:00"
  timezone: string;
  when?: string;
  reminderIndex?: number;
}) {
  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/reminder/schedule`,
      {
        id,
        date,
        time,
        timezone,
        when,
        reminderIndex,
      },
      {
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`, // optional security
        },
      },
    );
  } catch (error) {
    console.log("error from scheduleRemindersInNest", error);
  }
}
