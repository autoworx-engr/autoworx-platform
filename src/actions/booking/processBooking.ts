"use server";

import { db } from "@/lib/db";
import { Client, Appointment } from "@prisma/client";
import moment from "moment-timezone";
import { sendNewAppointmentNotification } from "@/lib/notification/task-and-appointment-notify";
import { scheduleRemindersInNest } from "../appointment/appointmentReminderScheduler";
import { sendInfobipEmail } from "../estimate/invoice/sendInfobipEmail";
import { sendTwilioMessage } from "../communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "../communication/client/sendInfobipMessage";
import { getBookingFormById } from "../settings/bookingForm";

export async function findClientByPhone(
  phone: string,
  companyId: string,
): Promise<Client | null> {
  try {
    const client = await db.client.findFirst({
      where: {
        mobile: phone,
        companyId: parseInt(companyId),
      },
    });
    return client;
  } catch (error) {
    console.error("Error finding client by phone:", error);
    return null;
  }
}

export async function createClient(data: {
  firstName: string;
  lastName?: string;
  email?: string;
  mobile: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  customerCompany?: string;
  companyId: string;
}): Promise<Client | null> {
  try {
    const client = await db.client.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName || "",
        email: data.email || "",
        mobile: data.mobile,
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        customerCompany: data.customerCompany || "",
        companyId: parseInt(data.companyId),
        isSalesAgent: true,
      },
    });
    return client;
  } catch (error) {
    console.error("Error creating client:", error);
    return null;
  }
}

export async function createAppointment(data: {
  title: string;
  date: string;
  startTime: string;
  clientId: number;
  companyId: string;
  userId?: number; // Optional, will use default user if not provided
  notes?: string; // Add notes parameter
}): Promise<Appointment | null> {
  try {
    // Calculate end time (1 hour after start time)
    const startDateTime = moment(`${data.date} ${data.startTime}`);
    const endDateTime = startDateTime.clone().add(1, "hour");

    // Get a default user for the company if userId not provided
    let userId = data.userId;
    if (!userId) {
      const defaultUser = await db.user.findFirst({
        where: {
          companyId: parseInt(data.companyId),
          employeeType: {
            in: ["Admin", "Manager"],
          },
        },
      });
      userId = defaultUser?.id || 1; // Fallback to user ID 1 if no admin/manager found
    }

    const appointment = await db.appointment.create({
      data: {
        title: data.title,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: endDateTime.format("HH:mm"),
        clientId: data.clientId,
        companyId: parseInt(data.companyId),
        userId: userId,
        notes: data.notes,
      },
      include: {
        company: { select: { timezone: true, name: true, smsGateway: true } },
        client: { select: { firstName: true, lastName: true, mobile: true } },
      },
    });

    try {
      const clientName =
        appointment?.client?.firstName || appointment?.client?.lastName || "";
      const appointmentDate = moment(
        `${data.date}T${data.startTime}:00`,
      ).format("dddd, MMMM DD, h:mm A");

      const confirmationTemplate = `Hi ${clientName}, your ${appointment?.company?.name} appt is on ${appointmentDate}. Reply YES to confirm, NO to cancel, or text here to reschedule. STOP to opt out.`;

      // Send confirmation email via Infobip
      try {
        await sendInfobipEmail({
          clientId: data.clientId,
          subject: "Appointment Confirmation",
          text: confirmationTemplate,
        });
      } catch (error) {
        console.error("sendInfobipEmail error:", error);
      }

      //send SMS confirmation
      try {
        if (appointment?.company?.smsGateway === "TWILIO") {
          await sendTwilioMessage({
            clientId: data.clientId,
            message: confirmationTemplate,
            attachments: [],
          });
        } else if (appointment?.company?.smsGateway === "INFOBIP") {
          await sendInfobipMessage({
            clientId: data.clientId,
            message: confirmationTemplate,
            attachments: [],
          });
        }
      } catch (error) {
        console.error("SMS send error:", error);
      }
    } catch (error) {
      console.log("🚀 ~ createAppointment ~ error:", error);
    }

    try {
      if (appointment.date && appointment.startTime) {
        await scheduleRemindersInNest({
          id: appointment.id.toString(),
          date: appointment.date,
          time: appointment.startTime,
          timezone:
            appointment?.company?.timezone || appointment.timezone || "Etc/UTC",
        });
      }
    } catch (error) {
      console.error("scheduleRemindersInNest error:", error);
    }

    return appointment;
  } catch (error) {
    console.error("Error creating appointment:", error);
    return null;
  }
}

export async function getAppointmentByDateTime(
  companyId: number,
  date: string,
  time?: string,
) {
  try {
    const appointment = await db.appointment.findMany({
      where: {
        companyId: companyId,
        date: new Date(date),
        startTime: time,
      },
    });
    return appointment;
  } catch (error) {
    console.error("Error fetching appointment by date and time:", error);
    return null;
  }
}

export async function processBooking(
  formData: {
    title: string;
    date: string;
    startTime: string;
    firstName: string;
    lastName?: string;
    email?: string;
    mobile: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    customerCompany?: string;
    notes?: string; // Add notes to the formData type
  },
  companyId: string,
  bookingId: number,
) {
  try {
    // First, check if client exists by phone number
    let client = await findClientByPhone(formData.mobile, companyId);
    const alreadyBookedAppointment = await getAppointmentByDateTime(
      parseInt(companyId),
      formData.date,
      formData.startTime,
    );
    console.log("Already booked appointments:", alreadyBookedAppointment);
    const bookingForm = await getBookingFormById(bookingId);
    const stack = bookingForm?.stack ?? 6;
    if (alreadyBookedAppointment && alreadyBookedAppointment.length >= stack) {
      throw new Error(
        "Selected time slot is fully booked. Please choose another time.",
      );
    }
    if (!client) {
      // Create new client if not found
      client = await createClient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        customerCompany: formData.customerCompany,
        companyId,
      });

      if (!client) {
        return {
          success: false,
          message: "Failed to create client",
        };
      }
    }

    // Create appointment
    const appointment = await createAppointment({
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      clientId: client.id,
      companyId,
      notes: formData.notes, // Pass the notes to createAppointment
    });

    if (!appointment) {
      return {
        success: false,
        message: "Failed to create appointment",
      };
    }

    // Send notification after successful appointment creation
    try {
      await sendNewAppointmentNotification({
        companyId: parseInt(companyId),
        clientName: `${client.firstName} ${client.lastName || ""}`,
        title: appointment.title,
        appointmentDate: appointment.date
          ? appointment.date.toISOString().split("T")[0]
          : "",
        startTime: appointment.startTime || "",
        assignSalesIds: [],
      });
    } catch (error) {
      console.error("Error sending appointment notification:", error);
    }

    return {
      success: true,
      message: "Appointment booked successfully!",
      data: {
        client,
        appointment,
      },
    };
  } catch (error) {
    console.error("Error processing booking:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Error processing booking",
    };
  }
}
