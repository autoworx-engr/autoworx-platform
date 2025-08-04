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
import { Cron } from "croner";
import moment from "moment";
import { getServerSession } from "next-auth";
// import { revalidatePath } from "next/cache";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import { sendMessage } from "../communication/client/sendMessage";
import { sendSendgridEmail } from "../estimate/invoice/sendSendgridMail";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";
import updateGoogleCalendarEvent from "../task/google-calendar/updateGoogleCalendarEvent";
import { deleteRemindersInNest } from "./deleteAppointment";
import { scheduleRemindersInNest } from "./addAppointment";

export interface AppointmentToUpdate {
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  assignedUsers: number[];
  clientId?: number;
  vehicleId?: number;
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

      if (existingAppointment?.draftEstimate !== appointment.draftEstimate) {
        // Create draft estimate (if doesn't exist)
        const draftEstimate = await db.invoice.findFirst({
          where: {
            id: appointment.draftEstimate,
          },
        });

        if (!draftEstimate) {
          await db.invoice.create({
            data: {
              id: appointment.draftEstimate,
              type: "Estimate",
              clientId: appointment.clientId,
              vehicleId: appointment.vehicleId,
              userId: session.user.id as any,
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

    // Delete all the assigned users for the appointment
    await db.appointmentUser.deleteMany({
      where: {
        appointmentId: id,
      },
    });

    // Loop the assigned users and add them to the Google Calendar
    for (const user of appointment.assignedUsers) {
      // const isAlreadyAssigned = await db.appointmentUser.findFirst({
      //   where: {
      //     appointmentId: id,
      //     userId: user,
      //   },
      // });

      // if (isAlreadyAssigned) {
      //   // If the user is already assigned, skip adding them again
      //   continue;
      // }

      // TODO: Add the task to the user's Google Calendar

      // Create the task user
      await db.appointmentUser.create({
        data: {
          appointmentId: id,
          userId: user,
          eventId: "null-for-now",
        },
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
      },
    });

    if (confirmationEmailTemplate) {
      const appointmentDate = moment(
        `${appointment.date}T${appointment.startTime}:00`
      ).format("dddd, MMMM DD, h:mm A");
      let confirmationSubject = confirmationEmailTemplate?.subject || "";
      let confirmationMessage = confirmationEmailTemplate?.message || "";

      // replace the placeholders: <VEHICLE>, <CLIENT>
      confirmationSubject = confirmationSubject?.replace(
        "<VEHICLE>",
        vehicle ? vehicle.model! : ""
      );
      confirmationSubject = confirmationSubject?.replace(
        "<CLIENT>",
        client ? client.firstName + " " + client.lastName : ""
      );

      confirmationMessage = confirmationMessage?.replace(
        "<VEHICLE>",
        vehicle ? vehicle.model! : ""
      );
      confirmationMessage = confirmationMessage?.replace(
        "<CLIENT>",
        client ? client.firstName + " " + client.lastName : ""
      );

      confirmationMessage = confirmationMessage?.replace(
        "<DATE>",
        appointmentDate
      );

      confirmationMessage = confirmationMessage?.replace(
        "<DATE>",
        appointmentDate
      );

      confirmationMessage = confirmationMessage?.replace(
        "<BUSINESS_NAME>",
        company?.name ?? ""
      );

      confirmationMessage = confirmationMessage?.replace(
        "<ADDRESS>",
        company?.address ?? ""
      );

      confirmationMessage = confirmationMessage?.replace(
        "<PHONE>",
        company?.phone ?? ""
      );

      // send the confirmation email
      if (appointment.confirmationEmailTemplateStatus) {
        // send email
        if (client) {
          await sendSendgridEmail({
            clientId: client.id,
            subject: confirmationSubject,
            text: confirmationMessage,
          });
          try {
            await sendMessage({
              companyId: client.companyId,
              clientId: client.id,
              message: confirmationMessage || "",
              attachments: [],
            });
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

    if (appointment.startTime) {
      for (const time of appointment?.times ?? []) {
        // Ensure the reminderDate is parsed correctly with the timezone
        const reminderDate = moment.tz(
          `${time.date}T${time.time}`,
          company?.timezone || appointment?.timezone || "Etc/UTC"
        );

        // Convert reminderDate to UTC for cron expression

        new Cron(
          reminderDate.toDate(), // Pass as Date object
          {
            timezone: company?.timezone || appointment?.timezone || "Etc/UTC",
          },
          async () => {
            const stillExists = await db.appointment.findUnique({
              where: { id: updatedAppointment.id },
            });

            if (!stillExists) {
              console.log("Appointment deleted. Skipping reminder.");
              return;
            }
            if (client && reminderTemplate) {
              const clientName = client?.firstName || client?.lastName || "";
              const reminderSubject = reminderTemplate.subject
                .replace(
                  "<VEHICLE>",
                  `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`
                )
                .replace("<CLIENT>", clientName)
                .replace(
                  "<DATE>",
                  moment(
                    `${appointment.date}T${appointment.startTime}:00`
                  ).format("dddd, MMMM DD, h:mm A")
                );

              const reminderMessage = (reminderTemplate?.message || "")
                .replace(
                  "<VEHICLE>",
                  `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`
                )
                .replace("<CLIENT>", clientName)
                .replace(
                  "<DATE>",
                  moment(
                    `${appointment.date}T${appointment.startTime}:00`
                  ).format("dddd, MMMM DD, h:mm A")
                )
                .replace("<BUSINESS_NAME>", company?.name ?? "")
                .replace("<ADDRESS>", company?.address ?? "")
                .replace("<PHONE>", company?.phone ?? "");

              try {
                sendSendgridEmail({
                  clientId: client.id,
                  subject: reminderSubject,
                  text: reminderMessage,
                });
              } catch (error) {
                console.log("🚀 ~ error:", error);
              }

              try {
                sendMessage({
                  companyId: client.companyId,
                  clientId: client.id,
                  message: reminderMessage || "",
                  attachments: [],
                });
              } catch (error) {
                console.log("🚀 ~ error:", error);
              }
            }
          }
        );
      }
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

    try {
      updatedAppointment.date &&
        updatedAppointment.startTime &&
        onAppointmentUpdate({
          id: updatedAppointment.id.toString(),
          date: updatedAppointment.date, // e.g., "2025-07-20"
          time: updatedAppointment.startTime, // e.g., "15:00"
          timezone:
            company?.timezone || updatedAppointment.timezone || "Etc/UTC",
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
        updatedAppointment.googleEventId &&
        updatedAppointment.startTime &&
        updatedAppointment.endTime &&
        updatedAppointment.date
      ) {
        updateGoogleCalendarEvent(
          updatedAppointment.googleEventId,
          appointment
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
          db.appointment.update({
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

async function onAppointmentUpdate({
  id,
  date,
  time,
  timezone,
}: {
  id: string;
  date: Date;
  time: string;
  timezone: string;
}) {
  // Step 1: Delete old reminders
  await deleteRemindersInNest(id);

  // Step 2: Schedule new reminders
  await scheduleRemindersInNest({ id, date, time, timezone });
}
