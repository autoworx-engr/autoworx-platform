"use client";

import { editVehicle } from "@/actions/vehicle/editVehicle";
import ColorSelector from "@/components/ColorSelector";
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
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { useFormErrorStore } from "@/stores/form-error";
import { Vehicle, VehicleColor } from "@prisma/client";
import { SquarePen } from "lucide-react";
import { useState } from "react";
import { extractVinFields, useVinDecode } from "../vin-decoder/useVinDecode";
import VINInputCamera from "../vin-decoder/vin-input";
import SelectorWithSearch from "./SelectorWithSearch";

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

  const [formData, setFormData] = useState({
    vehicleYear: vehicle.year ? String(vehicle.year) : "",
    vehicleMake: vehicle.make || "",
    vehicleModel: vehicle.model || "",
    other: vehicle.other || "",
  });
  const [engineSize, setEngineSize] = useState<string>(
    vehicle?.engineSize || "",
  );
  const [vinValue, setVinValue] = useState<string>(vehicle?.vin || "");
  const { decodeVin } = useVinDecode();

  const handleVinBlur = async (vin: string) => {
    const result = await decodeVin(vin);
    if (!result) return;
    const { year, make, model, displacement_cc } = extractVinFields(result);
    setFormData((prev) => ({
      ...prev,
      vehicleYear: year ? String(year) : prev.vehicleYear,
      vehicleMake: make || prev.vehicleMake,
      vehicleModel: model || prev.vehicleModel,
    }));
    if (displacement_cc) setEngineSize(displacement_cc);
  };

  const { data: years, isError: isYearFetchError }: any = useGetAllYears();
  const { data: makes, isError: isMakeFetchError }: any = useGetMake();
  const { data: models, isError: isModelsFetchError }: any =
    useGetModelsByYearAndMake(formData.vehicleYear!, formData.vehicleMake!);

  const vehicleOptions =
    makes?.data && makes.data.length > 0
      ? makes?.data?.map((vehicle: any) => ({
          title: vehicle.name ?? "Unknown",
          id: vehicle.name,
        }))
      : [];

  const vehicleModelOptions =
    models?.data && models.data.length > 0
      ? models?.data?.map((vehicle: any) => ({
          title: vehicle.name ?? "Unknown",
          id: vehicle.name,
        }))
      : [];

  const handleInputChange = (name: string, value: string | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || "",
    }));
  };

  async function handleSubmit(data: FormData) {
    if (
      !formData.vehicleYear ||
      !formData.vehicleMake ||
      !formData.vehicleModel
    ) {
      showError({
        field: !formData.vehicleYear
          ? "year"
          : !formData.vehicleMake
            ? "make"
            : "model",
        errorSource: [],
        message: !formData.vehicleYear
          ? "Vehicle year is required!"
          : !formData.vehicleMake
            ? "Vehicle make is required"
            : "Vehicle model is required",
      });
      return;
    }

    const year = +(formData.vehicleYear ?? 0) as number;
    const make = formData.vehicleMake! as string;
    const model = formData.vehicleModel! as string;
    const submodel = data.get("submodel") as string;
    const type = data.get("type") as string;
    const transmission = data.get("transmission") as string;
    const engineSize = data.get("engineSize") as string;
    const license = data.get("license") as string;
    const vin = data.get("vin") as string;
    const notes = data.get("notes") as string;
    const other = data.get("other") as string;

    if (!vehicle?.clientId) return;

    console.log("other", other);
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
      other: other || "",
      clientId: vehicle.clientId,
      vehicleId: vehicle.id,
    });

    console.log("response", res);
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
        <button type="button" className="text-xs text-primary">
          <SquarePen className="w-4 h-4 cursor-pointer" />
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

          {/* Year */}
          <SelectorWithSearch
            name="year"
            label="Vehicle Year"
            options={years?.data ?? []}
            rootClassName=""
            value={formData.vehicleYear}
            onChange={(value: any) => handleInputChange("vehicleYear", value)}
            isSearch={true}
            required={true}
            isClear={true}
            error={isYearFetchError ? "Failed to fetch years" : undefined}
            disabled={formData.other !== ""}
          />

          {/* Vehicle Make */}
          <SelectorWithSearch
            name="make"
            label="Vehicle Make"
            options={vehicleOptions || []}
            rootClassName=""
            value={formData.vehicleMake}
            onChange={(value: string) =>
              handleInputChange("vehicleMake", value)
            }
            isSearch={true}
            required={true}
            isClear={true}
            error={isMakeFetchError ? "Failed to fetch Makes" : undefined}
            disabled={formData.other !== ""}
          />
          {/* Vehicle Model */}
          <SelectorWithSearch
            name="model"
            label="Vehicle Model"
            options={vehicleModelOptions}
            rootClassName=""
            value={formData.vehicleModel}
            onChange={(value: string) =>
              handleInputChange("vehicleModel", value)
            }
            required={true}
            isSearch={true}
            isClear={true}
            disabled={!formData.vehicleMake || formData.other !== ""} // Disable if vehicle brand is not selected
            error={isModelsFetchError ? "Failed to fetch Models" : undefined}
          />
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
            value={engineSize}
            onChange={(e) => setEngineSize(e.target.value)}
            required={false}
          />
          <SlimInput
            name="license"
            defaultValue={vehicle?.license || ""}
            required={false}
            label="License Plate"
          />
          <div className="flex items-end gap-2">
            <SlimInput
              name="vin"
              value={vinValue}
              onChange={(e) => setVinValue(e.target.value)}
              onBlur={(e) => handleVinBlur(e.target.value)}
              required={false}
            />
            <VINInputCamera
              onVehicleInfo={(value) => {
                const { make, model, year, specs, vin } =
                  value?.data?.data || {};
                const { displacement_cc } = specs || {};

                setFormData((prev) => ({
                  ...prev,
                  vehicleYear: year ? String(year) : prev.vehicleYear,
                  vehicleMake: make || prev.vehicleMake,
                  vehicleModel: model || prev.vehicleModel,
                }));

                if (displacement_cc) setEngineSize(displacement_cc);
                if (vin) setVinValue(vin);
              }}
            />
          </div>
          <SlimInput
            name="other"
            required={false}
            label="Other (Vehicle not listed or non-vehicle job? Enter details here)"
            value={formData.other}
            onChange={(e) => handleInputChange("other", e.target.value)}
            rootClassName={`col-span-full ${
              !!formData.vehicleYear &&
              !!formData.vehicleMake &&
              !!formData.vehicleModel &&
              "cursor-not-allowed bg-gray-100 opacity-50"
            }`}
            disabled={
              !!formData.vehicleYear &&
              !!formData.vehicleMake &&
              !!formData.vehicleModel
            }
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
            className="rounded-lg border bg-primary px-5 py-2 text-white"
            formAction={handleSubmit}
          >
            Update
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
