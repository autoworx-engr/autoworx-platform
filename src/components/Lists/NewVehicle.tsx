"use client";

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
import { addVehicle } from "../../actions/vehicle/addVehicle";
import ColorSelector from "@/components/ColorSelector";

type TProps = {
  newButton?: React.ReactNode;
  onAdd?: (vehicle: Vehicle) => void;
  clientId: number;
};

export default function NewVehicle({ newButton, onAdd, clientId }: TProps) {
  const [open, setOpen] = useState(false);
  const { showError, clearError } = useFormErrorStore();
  const [selectedColor, setSelectedColor] = useState<VehicleColor | null>(null);

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

    const res = await addVehicle({
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
      clientId,
    });

    if (res.type === "globalError") {
      showError({
        field: res.field || "make",
        errorSource: res.errorSource,
        message: res.message || "",
      });
    } else if (res.type === "success") {
      onAdd && onAdd(res.data);
      setOpen(false);
      clearError();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {newButton ? (
          newButton
        ) : (
          <button type="button" className="text-xs text-[#6571FF]">
            + New Vehicle
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto] overflow-y-auto"
        form
      >
        <DialogHeader>
          <DialogTitle>Create Vehicle</DialogTitle>
        </DialogHeader>
        <div>
          <FormError />
          <div className="grid gap-2 overflow-y-auto sm:grid-cols-2">
            <SlimInput name="year" type="number" required={false} />
            <SlimInput name="make" required={false} />
            <SlimInput name="model" required={false} />
            <SlimInput name="submodel" required={false} label="Sub Model" />
            <SlimInput name="type" required={false} />

            {/* Use the reusable ColorSelector component */}
            <ColorSelector
              selectedColor={selectedColor}
              onSelect={setSelectedColor}
            />

            <SlimInput name="transmission" required={false} />
            <SlimInput name="engineSize" required={false} />
            <SlimInput name="license" required={false} label="License Plate" />
            <SlimInput name="vin" required={false} />
            <SlimInput
              name="notes"
              required={false}
              rootClassName="col-span-full"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="mt-1 rounded-lg border-2 border-slate-400 p-2 lg:mt-0">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
            formAction={handleSubmit}
          >
            Add
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
