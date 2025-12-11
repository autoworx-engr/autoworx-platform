"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BarcodeScanTab from "./barcode-scan-tab";
import TextScanTab from "./text-scan-tab";
import {
  CAR_VIN_DECODER_QUERY_KEY,
  useCarVinDecoder,
} from "@/hooks/useCarData";
import { useQueryClient } from "@tanstack/react-query";
import { getCarVinDecoder } from "@/service/car/api";
import { errorToast } from "@/lib/toast";

interface VINScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (vin: string, data: Record<string, any>) => void;
}

export default function VINScannerModal({
  isOpen,
  onClose,
  onScanComplete,
}: VINScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"barcode" | "text">("barcode");
  const [manualInput, setManualInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verbose] = useState(false);
  const [allTrims] = useState(false);
  const queryClient = useQueryClient();

  const handleTextSubmit = async () => {
    try {
      setIsLoading(true);
      if (manualInput?.length >= 5) {
        const data = await queryClient.fetchQuery({
          queryKey: [CAR_VIN_DECODER_QUERY_KEY, verbose, allTrims],
          queryFn: () => getCarVinDecoder(manualInput),
        });
        console.log("Submitting VIN:", manualInput);
        console.log("Decoded Data:", data);
        onScanComplete(manualInput, data);
        setManualInput("");
        onClose();
      }
    } catch (err) {
      console.error("Error decoding VIN:", err);
      errorToast("Failed to decode VIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-black hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <h2 className="mb-6 text-2xl font-bold text-black">Scan VIN</h2>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b ">
          <button
            type="button"
            onClick={() => {
              setActiveTab("barcode");
              // stopCamera();
            }}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "barcode"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Barcode Scan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              // stopCamera();
            }}
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === "text"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Text Input
          </button>
        </div>

        {/* Barcode Tab */}
        {activeTab === "barcode" && (
          <BarcodeScanTab onDetectedValue={vin => setManualInput(vin)} />
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <TextScanTab onDetectedValue={vin => setManualInput(vin)} />
        )}

        {/* Manual Input Fallback */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="mb-4 text-sm font-medium text-gray-700">
            Or enter manually:
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Modernized Input Field */}
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value.toUpperCase())}
              placeholder="Enter VIN (17 characters max)"
              maxLength={17}
              // Modern design classes: lighter border, rounded corners, subtle shadow, and a distinct focus ring.
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm transition duration-150 ease-in-out focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-base"
            />

            {/* Modernized Submit Button */}
            <button
              type="button"
              onClick={handleTextSubmit}
              disabled={manualInput.length < 5 || isLoading} // Keep the original minimum length check
              // Primary button design: distinct color, subtle hover, disabled state is clearly muted.
              className="w-full sm:w-auto rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md transition duration-150 ease-in-out hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
            >
              Submit
            </button>
          </div>
          {/* Optional helper text for clarity */}
          <p className="mt-2 text-xs text-gray-500">
            A VIN is 17 characters long and contains both numbers and letters.
          </p>
        </div>
      </div>
    </div>
  );
}
