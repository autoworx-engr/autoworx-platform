"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { encodeCompanyId } from "@/utils/companyIdEncoder";
import { BookingForm, Prisma } from "@prisma/client";

export async function getBooking(companyId: number) {
  try {
    const bookings = await db.bookingForm.findMany({
      where: { companyId },
    });
    return bookings;
  } catch (error) {
    console.error("Error fetching booking form settings", error);
    throw error;
  }
}

export async function getBookingFormById(bookingFormId: number) {
  try {
    const companyId = await getCompanyId();
    const booking = await db.bookingForm.findFirst({
      where: { id: bookingFormId, companyId },
    });
    return booking;
  } catch (error) {
    console.error("Error fetching booking form settings", error);
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
    const companyId = await getCompanyId();
    await db.bookingForm.updateMany({
      where: { id: bookingId, companyId },
      data: { ...data },
    });
    const updatedBookingForm = await db.bookingForm.findFirst({
      where: { id: bookingId, companyId },
    });
    return updatedBookingForm;
  } catch (error) {
    console.error("Error updating booking form settings", error);
    throw error;
  }
}

export async function initialCreateBookingForm(
  cId?: number,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? db;
  try {
    const companyId = cId ? cId : await getCompanyId();
    const bookingForm = await client.bookingForm.create({
      data: {
        title: "Appointment Booking Form",
        companyId: companyId,
        stack: 1,
        qrCodeUrl: "",
        bookingUrl: "",
      },
    });
    const encodedCompanyId = companyId
      ? encodeCompanyId(companyId.toString() + "_" + bookingForm.id)
      : "default";
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking-url?ref=${encodedCompanyId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingUrl)}`;

    const updatedBookingForm = await client.bookingForm.update({
      where: { id: bookingForm.id },
      data: {
        bookingUrl,
        qrCodeUrl,
      },
    });
    return updatedBookingForm;
  } catch (error) {
    console.error("Error creating booking form", error);
    throw error;
  }
}
