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
import { useEffect, useState } from "react";
import { addVehicle } from "../../actions/vehicle/addVehicle";
import ColorSelector from "@/components/ColorSelector";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import SelectorWithSearch from "./SelectorWithSearch";
import { Spin } from "antd";
import { usePathname } from "next/navigation";

type TProps = {
  newButton?: React.ReactNode;
  onAdd?: (vehicle: Vehicle) => void;
  clientId: number;
  setIsAppointmentModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewVehicle({
  newButton,
  onAdd,
  clientId,
  setIsAppointmentModalOpen,
}: TProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const { showError, clearError } = useFormErrorStore();
  const [selectedColor, setSelectedColor] = useState<VehicleColor | null>(null);
  const [formData, setFormData] = useState({
    vehicleYear: null,
    vehicleMake: null,
    vehicleModel: null,
    other: "",
  });
  const [isOtherPopulated, setIsOtherPopulated] = useState(false);
  useEffect(() => {
    setFormData({
      vehicleYear: null,
      vehicleMake: null,
      vehicleModel: null,
      other: "",
    });
    setIsOtherPopulated(false);
    setSelectedColor(null);
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      pathname
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
    <Dialog open={open && loading === false} onOpenChange={setOpen}>
      <DialogTrigger disabled={loading} asChild>
        {loading ? (
          <Spin />
        ) : newButton ? (
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
            {/* <SlimInput name="year" type="number" required={false} />
            <SlimInput name="make" required={false} />
            <SlimInput name="model" required={false} /> */}

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
              name="other"
              label="Other (Vehicle not listed or non-vehicle job? Enter details here)"
              required={false}
              rootClassName={`col-span-full ${
                !!formData.vehicleYear &&
                !!formData.vehicleMake &&
                !!formData.vehicleModel &&
                "cursor-not-allowed bg-gray-100 opacity-50"
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
            disabled={loading}
          >
            Add
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
