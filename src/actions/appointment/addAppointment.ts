"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import {
  createAppointmentValidationSchema,
  TCreateAppointmentValidationSchema,
} from "@/validations/schemas/task/appointment.validation";
import { Cron } from "croner";
import moment from "moment-timezone";
// import cron from "node-cron";
import { authOptions } from "@/authOptions";
import { sendNewAppointmentNotification } from "@/lib/notification/task-and-appointment-notify";
import { Client, Lead } from "@prisma/client";
import axios from "axios";
import { getServerSession } from "next-auth";
import { getGoogleCalendarToken } from "../calendar-settings/getGoogleCalendarAuth";
import { sendMessage } from "../communication/client/sendMessage";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";
import createGoogleCalendarEvent from "../task/google-calendar/createGoogleCalendarEvent";
export interface AppointmentToAdd {
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  assignedUsers: number[];
  clientId?: number;
  vehicleId?: number;
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
  appointment: TCreateAppointmentValidationSchema
): Promise<ServerAction | TErrorHandler> {
  try {
    await createAppointmentValidationSchema.parseAsync(appointment);
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to create an email template.");
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
        draftEstimate: appointment.draftEstimate,
        notes: appointment.notes,
        userId: parseInt(session.user.id),
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

    // Loop the assigned users and add them to the Google Calendar
    for (const user of appointment.assignedUsers) {
      const assignedUser = await db.user.findUnique({
        where: {
          id: user,
        },
      });

      // TODO: Add the task to the user's Google Calendar

      // Create the task user
      await db.appointmentUser.create({
        data: {
          appointmentId: newAppointment.id,
          userId: user,
          eventId: "null-for-now",
        },
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
          "Pending column not found for draft estimate at new appointment"
        );
      }

      if (!draftEstimate) {
        await db.invoice.create({
          data: {
            id: appointment.draftEstimate,
            type: "Estimate",
            clientId: appointment.clientId,
            vehicleId: appointment.vehicleId,
            userId: session.user.id as any,
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
      `${appointment.date}T${appointment.startTime}:00`
    ).format("dddd, MMMM DD, h:mm A");

    if (confirmationEmailTemplate) {
      let confirmationSubject = confirmationEmailTemplate?.subject || "";
      let confirmationMessage = confirmationEmailTemplate?.message || "";
      const clientName = client?.firstName || client?.lastName || "";

      // replace the placeholders: <VEHICLE>, <CLIENT>
      confirmationSubject = confirmationSubject?.replace(
        "<VEHICLE>",
        `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`
      );
      confirmationSubject = confirmationSubject?.replace(
        "<CLIENT>",
        clientName
      );

      confirmationMessage = confirmationMessage?.replace(
        "<VEHICLE>",
        `${vehicle?.year ? vehicle?.year : ""} ${vehicle?.make} ${vehicle?.model} ${vehicle?.other}`
      );
      confirmationMessage = confirmationMessage?.replace(
        "<CLIENT>",
        clientName
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
        "<PHONE>",
        company?.phone ?? ""
      );

      confirmationMessage = confirmationMessage?.replace(
        "<ADDRESS>",
        company?.address ?? ""
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
            sendMessage({
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

      if (appointment?.startTime) {
        for (const time of appointment.times) {
          // Ensure the reminderDate is parsed correctly with the timezone
          const reminderDate = moment.tz(
            `${time.date}T${time.time}`,
            company?.timezone || appointment?.timezone || "Etc/UTC"
          );

          new Cron(
            reminderDate.toDate(), // Pass as Date object
            {
              timezone: company?.timezone || appointment?.timezone || "Etc/UTC",
            },
            async () => {
              const stillExists = await db.appointment.findUnique({
                where: { id: newAppointment.id },
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
                      //@ts-expect-error
                      `${new Date(appointment?.date).toISOString()?.split("T")[0]}T${appointment.startTime}:00`
                    ).format("dddd, MMMM DD, h:mm A")
                  )
                  .replace("<BUSINESS_NAME>", company?.name ?? "")
                  .replace("<ADDRESS>", company?.address ?? "")
                  .replace("<PHONE>", company?.phone ?? "");

                try {
                  sendInfobipEmail({
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
    } catch (error) {}

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
}: {
  id: string;
  date: Date; // e.g., "2025-07-20"
  time: string; // e.g., "15:00"
  timezone: string;
}) {
  try {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/reminder/schedule`,
      {
        id,
        date,
        time,
        timezone,
      },
      {
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`, // optional security
        },
      }
    );
  } catch (error) {
    console.log("error from scheduleRemindersInNest", error);
  }
}
