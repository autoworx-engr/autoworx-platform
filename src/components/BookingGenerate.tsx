"use client";
import { RxCopy } from "react-icons/rx";
import { successToast } from "@/lib/toast";
import { TbQrcode } from "react-icons/tb";
import { encodeCompanyId } from "@/utils/companyIdEncoder";

const baseUrl = window.location.origin;

const BookingGenerate = ({ companyId }: { companyId?: string }) => {
  // Generate booking URL with encoded company_id as query parameter
  const encodedCompanyId = companyId ? encodeCompanyId(companyId) : 'default';
  const bookingUrl = `${baseUrl}/booking-url?ref=${encodedCompanyId}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 mt-10">
      <h2 className="mb-4 text-xl font-semibold text-gray-500 sm:text-2xl">
        Booking form
      </h2>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div
                className={`rounded-lg border border-gray-200 transition-all duration-200 hover:shadow-md`}
              >
                <div className="p-2 sm:p-3">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="max-w-full truncate text-sm font-medium text-gray-500 sm:max-w-xs sm:text-base md:max-w-sm">
                      Appointment booking form
                    </div>

                    <div className="flex space-x-1 self-end sm:space-x-2 sm:self-auto">
                      <button
                        className="rounded-full p-2 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => {
                          navigator.clipboard.writeText(bookingUrl);
                          successToast("Copied to clipboard!");
                        }}
                        aria-label="Copy link"
                        title="Copy link"
                      >
                        <RxCopy className="h-5 w-5 text-gray-800" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingGenerate;
