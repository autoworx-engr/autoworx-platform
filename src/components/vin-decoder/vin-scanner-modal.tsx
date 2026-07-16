"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import { CAR_VIN_DECODER_QUERY_KEY } from "@/hooks/useCarData";
import { errorToast } from "@/lib/toast";
import { getCarVinDecoder } from "@/service/car/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import TextScanTab from "./text-scan-tab";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl p-0 shadow-2xl">
        <div className="relative rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Scan VIN
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            {/* {activeTab === "barcode" && (
              <BarcodeScanTab onDetectedValue={vin => setManualInput(vin)} />
            )} */}

            <TextScanTab onDetectedValue={(vin) => setManualInput(vin)} />

            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Or enter manually:
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <SlimInput
                  name="vin"
                  label="VIN"
                  labelClassName="sr-only"
                  rootClassName="flex-1"
                  type="text"
                  value={manualInput}
                  autoFocus
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder="Enter VIN (17 characters max)"
                  maxLength={17}
                  autoComplete="off"
                />

                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={manualInput.length < 5 || isLoading}
                  className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white cursor-pointer
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
                >
                  Submit
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                A VIN is 17 characters long and contains both numbers and
                letters.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
