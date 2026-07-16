// VehicleAddPrompt.tsx (Example implementation using your Dialog components)
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import React from "react";

type TPromptProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: () => void;
  onCancel: () => void;
};

const VehicleAddPrompt: React.FC<TPromptProps> = ({
  isOpen,
  setIsOpen,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500">
            Would you like to add a vehicle for this client now?
          </p>
        </div>
        <DialogFooter className="sm:justify-start">
          <button
            type="button"
            onClick={onCancel}
            className="mt-1 rounded-lg border-2 border-slate-400 p-2 lg:mt-0"
          >
            No, skip
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border bg-primary px-5 py-2 text-white"
          >
            Yes, add vehicle
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleAddPrompt;
