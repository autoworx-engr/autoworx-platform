"use client";

import { editVehicle } from "@/actions/vehicle/editVehicle";
import ColorSelector from "@/components/ColorSelector";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { PencilLineIcon } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (open) {
      setFormData({
        vehicleYear: vehicle.year ? String(vehicle.year) : "",
        vehicleMake: vehicle.make || "",
        vehicleModel: vehicle.model || "",
        other: vehicle.other || "",
      });
      setSelectedColor(vehicle?.color ? vehicle.color : null);
      setEngineSize(vehicle?.engineSize || "");
      setVinValue(vehicle?.vin || "");
      clearError();
    }
  }, [open, vehicle]);
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
    setFormData((prev) => {
      const newData = { ...prev, [name]: value || "" };

      if (name === "vehicleMake") {
        if (prev[name as keyof typeof prev] !== (value || "")) {
          newData.vehicleModel = "";
        }
      }

      return newData;
    });
  };

  async function handleSubmit(data: FormData) {
    const other = data.get("other") as string;

    if (
      !other &&
      (!formData.vehicleYear || !formData.vehicleMake || !formData.vehicleModel)
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
      other: other || "",
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
        <button type="button" className="text-xs text-primary">
          <PencilLineIcon className="w-4 h-4 cursor-pointer" />
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update vehicle details for the client
          </DialogDescription>
        </DialogHeader>

        <FormError />

        <div className="thin-scrollbar scrollbar-track-transparent scrollbar-thumb-muted grid content-start items-start gap-x-4 gap-y-4 overflow-y-auto px-2 py-2 sm:grid-cols-2 md:px-4">
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
            placeholder="Enter sub model"
          />
          <SlimInput
            name="type"
            defaultValue={vehicle?.type || ""}
            required={false}
            placeholder="Enter type"
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
            placeholder="Enter transmission"
          />
          <SlimInput
            name="engineSize"
            value={engineSize}
            onChange={(e) => setEngineSize(e.target.value)}
            required={false}
            placeholder="Enter engine size"
          />
          <SlimInput
            name="license"
            defaultValue={vehicle?.license || ""}
            required={false}
            label="License Plate"
            placeholder="Enter license plate"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <SlimInput
                name="vin"
                label="Vin"
                placeholder="Enter VIN"
                rootClassName="flex-1"
                value={vinValue}
                onChange={(e) => setVinValue(e.target.value)}
                onBlur={(e) => handleVinBlur(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleVinBlur(vinValue);
                  }
                }}
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
            <p className="text-xs text-muted-foreground">
              Press Enter or click away after typing to auto-fill vehicle
              details
            </p>
          </div>
          <SlimInput
            name="other"
            required={false}
            label="Other (Vehicle not listed or non-vehicle job? Enter details here)"
            placeholder="Enter vehicle details"
            value={formData.other}
            onChange={(e) => handleInputChange("other", e.target.value)}
            rootClassName={`col-span-full ${
              !!formData.vehicleYear &&
              !!formData.vehicleMake &&
              !!formData.vehicleModel &&
              "cursor-not-allowed bg-muted opacity-50"
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
            placeholder="Enter notes"
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
