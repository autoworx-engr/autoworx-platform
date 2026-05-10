"use client";
import { useBookingFormCreateMutation } from "@/hooks/bookingForm/useBookingFormMutation";
import useBookingFormQuery from "@/hooks/bookingForm/useBookingFormQuery";
import { useQueryClient } from "@tanstack/react-query";
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
    <div className="mx-auto w-full max-w-6xl mt-4">
      <h2 className="mb-4 text-xl font-semibold text-gray-500 sm:text-2xl">
        Booking form
      </h2>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md">
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingGenerate;
