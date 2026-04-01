"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";

export type ServiceInfoState = {
  serviceTitle: string;
  description: string;
  imageName: string;
  imageUrl: string;
  vehicleTypeModifiers: {
    coupe: string;
    sedan: string;
    suv: string;
    truck: string;
  };
};

type ServiceInfoProps = {
  value: ServiceInfoState;
  onChange: Dispatch<SetStateAction<ServiceInfoState>>;
  onImageSelect: (file: File | null) => void;
  errors?: {
    serviceTitle?: string;
    description?: string;
  };
};

export default function ServiceInfo({
  value,
  onChange,
  onImageSelect,
  errors,
}: ServiceInfoProps) {
  const { serviceTitle, description, imageName, vehicleTypeModifiers } = value;

  const setVehicleTypeModifiers = (
    updater: (
      prev: ServiceInfoState["vehicleTypeModifiers"],
    ) => ServiceInfoState["vehicleTypeModifiers"],
  ) => {
    onChange((prev) => ({
      ...prev,
      vehicleTypeModifiers: updater(prev.vehicleTypeModifiers),
    }));
  };

  const handleImageChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] || null;

    onChange((prev) => ({
      ...prev,
      imageName: file?.name || "",
    }));

    onImageSelect(file);
  };

  return (
    <div className="h-full w-full space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">
          Service Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={serviceTitle}
          onChange={(event) =>
            onChange((prev) => ({ ...prev, serviceTitle: event.target.value }))
          }
          placeholder="Enter service title"
          className={cn(
            "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-400",
            errors?.serviceTitle ? "border-red-500" : "border-slate-300",
            slimInputClassName,
          )}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(event) =>
            onChange((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Enter service description"
          rows={4}
          className={cn(
            "w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-400",
            errors?.description ? "border-red-500" : "border-slate-300",
            slimInputClassName,
          )}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Service Image</label>
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="truncate">{imageName || "Choose image (PNG, JPG, WEBP)"}</span>
          <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
            Browse
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Vehicle Type Price Modifiers (+$)
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { key: "coupe", label: "Coupe" },
            { key: "sedan", label: "Sedan" },
            { key: "suv", label: "SUV" },
            { key: "truck", label: "Truck" },
          ].map((vehicleType) => (
            <div key={vehicleType.key} className="space-y-1">
              <label className="text-xs text-slate-500">{vehicleType.label}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                inputMode="decimal"
                value={
                  vehicleTypeModifiers[
                    vehicleType.key as keyof typeof vehicleTypeModifiers
                  ] === "0"
                    ? ""
                    : vehicleTypeModifiers[
                    vehicleType.key as keyof typeof vehicleTypeModifiers
                    ]
                }
                onKeyDown={(event) => {
                  if (["e", "E", "+", "-"].includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (nextValue === "" || /^\d*\.?\d{0,2}$/.test(nextValue)) {
                    setVehicleTypeModifiers((prev) => ({
                      ...prev,
                      [vehicleType.key]: nextValue,
                    }));
                  }
                }}
                className={cn(
                  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400",
                  slimInputClassName,
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
