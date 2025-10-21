"use server";

import { db } from "@/lib/db";
import { BookingForm } from "@prisma/client";

export async function getBooking(companyId: number) {
  try {
    const bookings = await db.bookingForm.findMany({
      where: { companyId },
    });
    return bookings;
  } catch (error) {
    console.log("Error fetching booking form settings", error);
    throw error;
  }
}

export async function updateBookingForm(
  bookingId: number,
  data: Partial<Omit<BookingForm, "id" | "companyId" | "createdAt" | "updatedAt">>
) {
  try {
    const updatedBookingForm = await db.bookingForm.update({
      where: { id: bookingId },
      data: { ...data },
    });
    return updatedBookingForm;
  } catch (error) {
    console.log("Error updating booking form settings", error);
    throw error;
  }
}

export async function createBookingForm(
  data: Omit<BookingForm, "id" | "createdAt" | "updatedAt">
) {
  try {
    const newBookingForm = await db.bookingForm.create({
      data: {
        ...data,
      },
    });
    return newBookingForm;
  } catch (error) {
    console.log("Error creating booking form", error);
    throw error;
  }
}
