"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import VINScannerModal from "./vin-scanner-modal";
import { useState } from "react";
import { createPortal } from "react-dom";

interface VINInputProps {
  onVehicleInfo: (vehicleInfo: {
    vin: string;
    data: Record<string, any>;
  }) => void;
}

export default function VINInputCamera({ onVehicleInfo }: VINInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleScanComplete = (
    scannedVin: string,
    data: Record<string, any>
  ) => {
    onVehicleInfo({ vin: scannedVin, data });
  };

  const onCameraClick = () => {
    setIsModalOpen(true);
  };
  return (
    <>
      <div className="space-y-4">
        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            onClick={onCameraClick}
            size="icon"
            className="bg-blue-700 text-white hover:bg-blue-600"
            title="Open scanner"
          >
            <CameraIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {/* {createPortal( */}
      <VINScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onScanComplete={handleScanComplete}
      />
      {/* document.body
      )} */}
    </>
  );
}
