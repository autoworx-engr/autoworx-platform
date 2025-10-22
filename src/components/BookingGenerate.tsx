"use client";
import { useEffect, useState } from "react";
import { successToast } from "@/lib/toast";
import { encodeCompanyId } from "@/utils/companyIdEncoder";
import Image from "next/image";
import { Copy, QrCode, Upload, Power } from "lucide-react";
import useBookingFormQuery from "@/hooks/bookingForm/useBookingFormQuery";
import {
  useBookingFormCreateMutation,
  useBookingFormUpdateMutation,
} from "@/hooks/bookingForm/useBookingFormMutation";
import BookingFormCard from "./BookFormCard";

const baseUrl = window.location.origin;

const BookingGenerate = ({ companyId }: { companyId?: string }) => {
  const [showQR, setShowQR] = useState(false);
  const {
    data: bookingForms,
    isLoading,
    isError,
    refetch,
  } = useBookingFormQuery(Number(companyId));
  const { mutateAsync: createMutation } = useBookingFormCreateMutation();

  useEffect(() => {
    const initializeForm = async () => {
      if (bookingForms && bookingForms.length <= 0) {
        // Generate booking URL with encoded company_id as query parameter
        const defaultStack = 1;
        const encodedCompanyId = companyId
          ? encodeCompanyId(companyId + "-" + defaultStack)
          : "default";
        const bookingUrl = `${baseUrl}/booking-url?ref=${encodedCompanyId}`;

        // Generate QR code URL
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingUrl)}`;

        await createMutation({
          title: "Appointment Booking Form",
          description: "",
          bookingUrl,
          qrCodeUrl,
          stack: 1,
          companyId: Number(companyId),
          isActive: true,
        });
        refetch();
      }
    };
    initializeForm();
  }, [bookingForms]);
  let content = null;
  if (isLoading) {
    content = <div>Loading...</div>;
  } else if (isError) {
    content = <div className="text-red-400">Error loading booking forms.</div>;
  } else {
    content = bookingForms?.map(bookingForm => (
      <BookingFormCard key={bookingForm.id} bookingForm={bookingForm} />
    ));
  }

  return (
    <div className="mx-auto w-full max-w-6xl sm:px-6 md:px-8 mt-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-500 sm:text-2xl">
        Booking form
      </h2>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div
                className={`rounded-lg border ${
                  showQR ? "border-blue-400" : "border-gray-200"
                } transition-all duration-200 hover:shadow-md`}
              >
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
