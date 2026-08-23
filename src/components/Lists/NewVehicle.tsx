"use client";

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
import { Spin } from "antd";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { addVehicle } from "../../actions/vehicle/addVehicle";
import { extractVinFields, useVinDecode } from "../vin-decoder/useVinDecode";
import VINInputCamera from "../vin-decoder/vin-input";
import SelectorWithSearch from "./SelectorWithSearch";

type TProps = {
  newButton?: React.ReactNode;
  onAdd?: (vehicle: Vehicle) => void;
  clientId: number;
  setIsAppointmentModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewVehicle({
  newButton,
  onAdd,
  clientId,
  setIsAppointmentModalOpen,
  open: externalOpen,
  setOpen: externalSetOpen,
}: TProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const { showError, clearError } = useFormErrorStore();
  const [selectedColor, setSelectedColor] = useState<VehicleColor | null>(null);
  const [engineSize, setEngineSize] = useState<string>("");
  const [vinCode, setVinCOde] = useState<string>("");
  const [formData, setFormData] = useState({
    vehicleYear: null,
    vehicleMake: null,
    vehicleModel: null,
    other: "",
  });
  const [isOtherPopulated, setIsOtherPopulated] = useState(false);
  const { decodeVin } = useVinDecode();

  const handleVinBlur = async (vin: string) => {
    const result = await decodeVin(vin);
    if (!result) return;
    const { year, make, model, displacement_cc } = extractVinFields(result);
    setFormData((prev) => ({
      ...prev,
      vehicleYear: year ?? prev.vehicleYear,
      vehicleMake: make ?? prev.vehicleMake,
      vehicleModel: model ?? prev.vehicleModel,
    }));
    if (displacement_cc) setEngineSize(displacement_cc);
  };

  // Use external open state if provided, otherwise use internal
  const isControlled =
    externalOpen !== undefined && externalSetOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? externalSetOpen : setInternalOpen;

  useEffect(() => {
    if (open) {
      setFormData({
        vehicleYear: null,
        vehicleMake: null,
        vehicleModel: null,
        other: "",
      });
      setIsOtherPopulated(false);
      setSelectedColor(null);
      setEngineSize("");
      setVinCOde("");
    }
  }, [open]);

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

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      if (name === "vehicleMake") {
        if (prev[name as keyof typeof prev] !== value) {
          newData.vehicleModel = null;
        }
      }

      return newData;
    });
  };

  async function handleSubmit(data: FormData) {
    if (
      !data.get("other") &&
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
    const other = data.get("other") as string;
    const notes = data.get("notes") as string;
    setLoading(true);
    const res = await addVehicle(
      {
        year,
        make,
        model,
        submodel,
        type: type || "",
        colorId: selectedColor?.id,
        transmission,
        engineSize,
        license,
        vin,
        notes,
        other,
        clientId,
      },
      pathname,
    );

    if (res?.type === "globalError") {
      showError({
        field: res.field || "make",
        errorSource: res.errorSource,
        message: res.message || "",
      });
      setLoading(false);
    } else if (res?.type === "success") {
      onAdd && onAdd(res.data);
      setOpen(false);
      clearError();
      setLoading(false);
      setIsAppointmentModalOpen && setIsAppointmentModalOpen(true);
    }
  }

  return (
    <Dialog open={open && !loading} onOpenChange={setOpen}>
      {/* Only show trigger if NOT controlled externally */}
      {!isControlled && (
        <DialogTrigger disabled={loading} asChild>
          {loading ? (
            <Spin />
          ) : newButton ? (
            newButton
          ) : (
            <button
              type="button"
              className="text-xs font-medium text-primary transition-colors hover:text-[#5a66ee]"
            >
              + New Vehicle
            </button>
          )}
        </DialogTrigger>
      )}

      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
          <DialogDescription>
            Enter vehicle details for the client
          </DialogDescription>
        </DialogHeader>

        <FormError />

        <div className="thin-scrollbar scrollbar-track-transparent scrollbar-thumb-muted space-y-4 overflow-y-auto px-2 py-2 md:px-4">
          <div className="grid content-start items-start gap-x-4 gap-y-4 sm:grid-cols-2">
            {/* Year */}
            <SelectorWithSearch
              name="year"
              label="Vehicle Year"
              options={years?.data ?? []}
              rootClassName=""
              value={formData.vehicleYear! || ""}
              onChange={(value: any) => handleInputChange("vehicleYear", value)}
              isSearch={true}
              required={true}
              isClear={true}
              error={isYearFetchError ? "Failed to fetch years" : undefined}
              disabled={isOtherPopulated}
            />

            {/* Vehicle Make */}
            <SelectorWithSearch
              name="make"
              label="Vehicle Make"
              options={vehicleOptions || []}
              rootClassName=""
              value={formData.vehicleMake!}
              onChange={(value: string) =>
                handleInputChange("vehicleMake", value)
              }
              isSearch={true}
              required={true}
              isClear={true}
              error={isMakeFetchError ? "Failed to fetch Makes" : undefined}
              disabled={isOtherPopulated}
            />

            {/* Vehicle Model */}
            <SelectorWithSearch
              name="model"
              label="Vehicle Model"
              options={vehicleModelOptions}
              rootClassName=""
              value={formData.vehicleModel!}
              onChange={(value: string) =>
                handleInputChange("vehicleModel", value)
              }
              required={true}
              isSearch={true}
              isClear={true}
              disabled={!formData.vehicleMake || isOtherPopulated}
              error={isModelsFetchError ? "Failed to fetch Models" : undefined}
            />

            <SlimInput
              name="submodel"
              required={false}
              label="Sub Model"
              placeholder="Enter sub model"
            />
            <SlimInput name="type" required={false} placeholder="Enter type" />

            {/* Use the reusable ColorSelector component */}
            <ColorSelector
              selectedColor={selectedColor}
              onSelect={setSelectedColor}
            />

            <SlimInput
              name="transmission"
              required={false}
              placeholder="Enter transmission"
            />
            <SlimInput
              name="engineSize"
              required={false}
              placeholder="Enter engine size"
              value={engineSize}
              onChange={(e) => setEngineSize(e.target.value)}
            />
            <SlimInput
              name="license"
              required={false}
              label="License Plate"
              placeholder="Enter license plate"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <SlimInput
                  name="vin"
                  label="Vin"
                  required={false}
                  placeholder="Enter VIN"
                  rootClassName="flex-1"
                  value={vinCode}
                  onChange={(e) => setVinCOde(e.target.value)}
                  onBlur={(e) => handleVinBlur(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVinBlur(vinCode);
                    }
                  }}
                />

                <VINInputCamera
                  onVehicleInfo={(value) => {
                    const { make, model, year, specs } =
                      value?.data?.data || {};
                    const { displacement_cc } = specs || {};
                    setFormData({
                      vehicleYear: year,
                      vehicleMake: make,
                      vehicleModel: model,
                      other: "",
                    });
                    setEngineSize(displacement_cc || "");
                    setVinCOde(value?.vin || "");
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
              label="Other (Vehicle not listed or non-vehicle job? Enter details here)"
              required={false}
              placeholder="Enter vehicle details"
              rootClassName={`col-span-full ${
                !!formData.vehicleYear &&
                !!formData.vehicleMake &&
                !!formData.vehicleModel &&
                "cursor-not-allowed bg-muted opacity-50"
              }`}
              onChange={(e) => {
                let value = e.target.value;
                setIsOtherPopulated(value?.length > 0);
              }}
              disabled={
                !!formData.vehicleYear &&
                !!formData.vehicleMake &&
                !!formData.vehicleModel
              }
            />
            <SlimInput
              name="notes"
              required={false}
              placeholder="Enter notes"
              rootClassName="col-span-full"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="mt-2 rounded-md border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:mt-0">
            Cancel
          </DialogClose>
          <Submit
            className="rounded-md bg-gradient-to-r from-primary to-[#5a66ee] px-6 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50"
            formAction={handleSubmit}
            disabled={loading}
          >
            Add
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
