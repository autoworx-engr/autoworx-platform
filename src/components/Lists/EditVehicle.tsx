"use client";

import { editVehicle } from "@/actions/vehicle/editVehicle";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { useFormErrorStore } from "@/stores/form-error";
import { Vehicle, VehicleColor } from "@prisma/client";
import { useState } from "react";
import { FaPen } from "react-icons/fa";
import ColorSelector from "@/components/ColorSelector";

export default function EditVehicle({
  vehicle,
}: {
  vehicle: Vehicle & { color?: VehicleColor | undefined };
}) {
  const [open, setOpen] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  const [selectedColor, setSelectedColor] = useState<VehicleColor | null>(
    vehicle?.color ? vehicle.color : null,
  );

  async function handleSubmit(data: FormData) {
    const year = +(data.get("year") ?? 0) as number;
    const make = data.get("make") as string;
    const model = data.get("model") as string;
    const submodel = data.get("submodel") as string;
    const type = data.get("type") as string;
    const transmission = data.get("transmission") as string;
    const engineSize = data.get("engineSize") as string;
    const license = data.get("license") as string;
    const vin = data.get("vin") as string;
    const notes = data.get("notes") as string;

    if (!vehicle?.clientId) return;

    const res = await editVehicle({
      year,
      make,
      model,
      submodel,
      type,
      colorId: selectedColor?.id,
      transmission,
      engineSize,
      license,
      vin,
      notes,
      clientId: vehicle.clientId,
      vehicleId: vehicle.id,
    });

    if (res.type === "globalError") {
      showError({
        field: res.field,
        message:
          res.errorSource && res.errorSource?.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
    } else if (res.type === "success") {
      setOpen(false);
      clearError();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-[#6571FF]">
          <FaPen />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 overflow-y-auto sm:grid-cols-2">
          <FormError />

          <SlimInput
            name="year"
            type="number"
            defaultValue={vehicle?.year || ""}
          />
          <SlimInput name="make" defaultValue={vehicle?.make || ""} />
          <SlimInput name="model" defaultValue={vehicle?.model || ""} />
          <SlimInput
            name="submodel"
            defaultValue={vehicle?.submodel || ""}
            required={false}
            label="Sub Model"
          />
          <SlimInput
            name="type"
            defaultValue={vehicle?.type || ""}
            required={false}
          />

          {/* ColorSelector component */}
          <ColorSelector
            selectedColor={selectedColor}
            onSelect={setSelectedColor}
          />

          <SlimInput
            name="transmission"
            defaultValue={vehicle?.transmission || ""}
            required={false}
          />
          <SlimInput
            name="engineSize"
            defaultValue={vehicle?.engineSize || ""}
            required={false}
          />
          <SlimInput
            name="license"
            defaultValue={vehicle?.license || ""}
            required={false}
            label="License Plate"
          />
          <SlimInput
            name="vin"
            defaultValue={vehicle?.vin || ""}
            required={false}
          />
          <SlimInput
            name="notes"
            defaultValue={vehicle?.notes || ""}
            required={false}
            rootClassName="col-span-full"
          />
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
            formAction={handleSubmit}
          >
            Update
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
