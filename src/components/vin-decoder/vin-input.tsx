"use client";

import { Button } from "@/components/ui/button";
import { CameraIcon } from "lucide-react";
import { useState } from "react";
import VINScannerModal from "./vin-scanner-modal";

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
    data: Record<string, any>,
  ) => {
    onVehicleInfo({ vin: scannedVin, data });
  };

  const onCameraClick = () => {
    setIsModalOpen(true);
  };
  return (
    <>
      <Button
        type="button"
        onClick={onCameraClick}
        size="icon"
        className="h-9 w-9 shrink-0 bg-primary text-white hover:bg-[#5a66ee]"
        title="Open scanner"
      >
        <CameraIcon className="h-5 w-5" />
      </Button>
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
