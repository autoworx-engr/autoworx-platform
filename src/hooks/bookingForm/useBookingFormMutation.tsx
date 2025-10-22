import {
  initialCreateBookingForm,
  updateBookingForm,
} from "@/actions/settings/bookingForm";
import { BookingForm } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";

export function useBookingFormUpdateMutation() {
  return useMutation({
    mutationFn: async (data: {
      bookFormId: number;
      data: Partial<
        Omit<BookingForm, "id" | "companyId" | "createdAt" | "updatedAt">
      >;
    }) => {
      return updateBookingForm(data.bookFormId, {
        bookingUrl: data.data.bookingUrl,
        isActive: data.data.isActive,
        qrCodeUrl: data.data.qrCodeUrl,
        stack: data.data.stack,
      });
    },
  });
}

export function useBookingFormCreateMutation() {
  return useMutation({
    mutationFn: async () => {
      try {
        const newBookingForm = await initialCreateBookingForm();
        return newBookingForm;
      } catch (error) {
        console.log("Error creating booking form", error);
        throw error;
      }
    },
  });
}
