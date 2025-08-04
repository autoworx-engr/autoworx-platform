"use server";

import { db } from "@/lib/db";
import { Client, Appointment } from "@prisma/client";
import moment from "moment";

export async function findClientByPhone(phone: string, companyId: string): Promise<Client | null> {
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
}): Promise<Appointment | null> {
  try {
    // Calculate end time (1 hour after start time)
    const startDateTime = moment(`${data.date} ${data.startTime}`);
    const endDateTime = startDateTime.clone().add(1, 'hour');
    
    // Get a default user for the company if userId not provided
    let userId = data.userId;
    if (!userId) {
      const defaultUser = await db.user.findFirst({
        where: {
          companyId: parseInt(data.companyId),
          employeeType: {
            in: ['Admin', 'Manager']
          }
        },
      });
      userId = defaultUser?.id || 1; // Fallback to user ID 1 if no admin/manager found
    }
    
    const appointment = await db.appointment.create({
      data: {
        title: data.title,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: endDateTime.format('HH:mm'),
        clientId: data.clientId,
        companyId: parseInt(data.companyId),
        userId: userId,
        notes: `Online booking appointment`, // Add a note indicating it's an online booking
      },
    });
    return appointment;
  } catch (error) {
    console.error("Error creating appointment:", error);
    return null;
  }
}

export async function processBooking(formData: {
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
}, companyId: string) {
  try {
    // First, check if client exists by phone number
    let client = await findClientByPhone(formData.mobile, companyId);
    
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
    });
    
    if (!appointment) {
      return {
        success: false,
        message: "Failed to create appointment",
      };
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
      message: "An error occurred while processing your booking",
    };
  }
}
