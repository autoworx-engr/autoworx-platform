"use client";
import { useBookingFormUpdateMutation } from "@/hooks/bookingForm/useBookingFormMutation";
import { successToast } from "@/lib/toast";
import { BookingForm } from "@prisma/client";
import { Copy, Power, QrCode, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type BookingFormCardProps = {
  bookingForm: BookingForm;
};

export default function BookingFormCard({ bookingForm }: BookingFormCardProps) {
  const {
    bookingUrl,
    id,
    isActive: savedIsActive,
    qrCodeUrl,
    stack: savedStack,
  } = bookingForm || {};
  const [showQR, setShowQR] = useState(false);
  const [stack, setStack] = useState(savedStack);
  const [hasChanges, setHasChanges] = useState(false);
  const [isActive, setIsActive] = useState(savedIsActive);

  const { mutateAsync: updateMutation, isPending } =
    useBookingFormUpdateMutation();

  const handleStackChange = (value: number) => {
    setStack(value);
    setHasChanges(true);
  };
  const handleUpload = async () => {
    try {
      // Add your upload logic here
      // This is a placeholder for the actual API call
      await updateMutation({
        bookFormId: id,
        data: {
          stack,
        },
      });

      successToast("Changes uploaded successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleActiveToggle = async () => {
    try {
      setIsActive(!isActive);
      await updateMutation({
        bookFormId: id,
        data: {
          isActive: !isActive,
        },
      });
      successToast(isActive ? "Booking form disabled" : "Booking form enabled");
    } catch (error) {
      setIsActive(isActive); // Revert state on error
      console.error("Error toggling active state:", error);
    }
  };
  return (
    <div className="p-2 sm:p-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="max-w-full truncate text-sm font-medium text-gray-500 sm:max-w-xs sm:text-base md:max-w-sm">
          Appointment booking form
          <span
            className={`ml-2 inline-block px-2 py-1 rounded text-xs font-semibold ${
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>{" "}
        <div className="flex space-x-1 self-end sm:space-x-2 sm:self-auto">
          {!hasChanges && (
            <button
              className="rounded-full p-2 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl);
                successToast("Copied to clipboard!");
              }}
              aria-label="Copy link"
              title="Copy link"
            >
              <Copy className="h-5 w-5 text-gray-800" />
            </button>
          )}

          {/* Stack/Quantity Dropdown */}
          <select
            value={stack}
            onChange={e => handleStackChange(parseInt(e.target.value))}
            className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Select stack quantity"
            title="Select quantity for stack"
          >
            {[1, 2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num}>
                Stack: {num}
              </option>
            ))}
          </select>

          {!hasChanges && (
            <button
              className={`rounded-full p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                showQR ? "bg-blue-50" : "hover:bg-gray-100"
              }`}
              onClick={() => setShowQR(!showQR)}
              aria-label="Show QR code"
              title="Show QR code"
            >
              <QrCode
                className={`h-5 w-5 ${showQR ? "text-blue-500" : "text-gray-800"}`}
              />
            </button>
          )}

          {/* Active/Inactive Toggle Button */}
          {!hasChanges && (
            <button
              onClick={handleActiveToggle}
              className={`rounded-full p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isActive
                  ? "bg-green-50 hover:bg-green-100"
                  : "bg-red-50 hover:bg-red-100"
              }`}
              aria-label={
                isActive ? "Deactivate booking form" : "Activate booking form"
              }
              title={isActive ? "Deactivate" : "Activate"}
            >
              <Power
                className={`h-5 w-5 ${isActive ? "text-green-600" : "text-red-600"}`}
              />
            </button>
          )}

          {/* Upload Button - Shows when changes are made */}
          {hasChanges && (
            <button
              onClick={handleUpload}
              disabled={isPending}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-600 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Upload changes"
              title="Upload changes"
            >
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {isPending ? "Updating..." : "Update"}
              </div>
            </button>
          )}
        </div>
      </div>

      {showQR && (
        <div className="mt-4 flex flex-col items-end justify-center gap-4 sm:flex-row sm:justify-end">
          <button
            onClick={() => {
              navigator.clipboard.writeText(qrCodeUrl);
              successToast("QR code copied!");
            }}
            className="order-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:order-1"
          >
            Copy QR Code
          </button>
          <div className="order-1 rounded-lg border border-gray-100 bg-white p-2 shadow-sm sm:order-2">
            <Image
              src={qrCodeUrl}
              alt="QR code for booking form"
              width={120}
              height={120}
              className="h-32 w-32 sm:h-36 sm:w-36"
              priority={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
