"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { encodeCompanyId } from "@/utils/companyIdEncoder";
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

export async function getBookingFormById(bookingFormId: number) {
  try {
    const booking = await db.bookingForm.findUnique({
      where: { id: bookingFormId },
    });
    return booking;
  } catch (error) {
    console.log("Error fetching booking form settings", error);
    throw error;
  }
}

export async function updateBookingForm(
  bookingId: number,
  data: Partial<
    Omit<BookingForm, "id" | "companyId" | "createdAt" | "updatedAt">
  >,
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

export async function initialCreateBookingForm(cId?: number) {
  try {
    const companyId = cId ? cId : await getCompanyId();
    // Generate booking URL with encoded company_id as query parameter
    const bookingForm = await db.bookingForm.create({
      data: {
        title: "Appointment Booking Form",
        companyId: companyId,
        stack: 1,
        qrCodeUrl: "",
        bookingUrl: "",
      },
    });
    // Generate booking URL with encoded company_id as query parameter
    const encodedCompanyId = companyId
      ? encodeCompanyId(companyId.toString() + "_" + bookingForm.id)
      : "default";
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking-url?ref=${encodedCompanyId}`;

    // Generate QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingUrl)}`;

    const updatedBookingForm = await db.bookingForm.update({
      where: { id: bookingForm.id },
      data: {
        bookingUrl,
        qrCodeUrl,
      },
    });
    return updatedBookingForm;
  } catch (error) {
    console.log("Error creating booking form", error);
    throw error;
  }
}
