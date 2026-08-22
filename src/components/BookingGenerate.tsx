"use client";
import { useBookingFormCreateMutation } from "@/hooks/bookingForm/useBookingFormMutation";
import useBookingFormQuery from "@/hooks/bookingForm/useBookingFormQuery";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { useCallback, useEffect } from "react";
import BookingFormCard from "./BookFormCard";

const BookingGenerate = ({ companyId }: { companyId?: string }) => {
  const queryClient = useQueryClient();
  const {
    data: bookingForms,
    isLoading,
    isError,
  } = useBookingFormQuery(Number(companyId));
  const { mutateAsync: createMutation } = useBookingFormCreateMutation();

  const initializeForm = useCallback(async () => {
    if (bookingForms && bookingForms.length <= 0) {
      const newForm = await createMutation();
      if (newForm) {
        queryClient.setQueryData(["bookingForm"], [newForm]);
      }
    }
  }, [bookingForms, createMutation, queryClient]);

  useEffect(() => {
    initializeForm();
  }, [initializeForm]);

  let content = null;
  if (isLoading) {
    content = (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  } else if (isError) {
    content = <div className="text-red-400">Error loading booking forms.</div>;
  } else {
    content = bookingForms?.map((bookingForm) => (
      <BookingFormCard key={bookingForm.id} bookingForm={bookingForm} />
    ));
  }

  return (
    <div className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm md:p-6">
      <div className="flex items-center gap-2 border-b border-slate-200/70 pb-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-500">
          <CalendarCheck className="h-4.5 w-4.5" />
        </span>
        <div>
          <h4 className="text-lg font-semibold text-slate-600">Booking Form</h4>
          <p className="text-sm text-slate-500">
            Share and manage your customer booking form links.
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingGenerate;
