"use client";

import { slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function ServiceInfo() {
  const [serviceTitle, setServiceTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [vehicleTypeModifiers, setVehicleTypeModifiers] = useState({
    coupe: "0",
    sedan: "0",
    suv: "0",
    truck: "0",
  });

  return (
    <div className="h-full w-full space-y-4 rounded-md border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Service Title</label>
        <input
          type="text"
          value={serviceTitle}
          onChange={(event) => setServiceTitle(event.target.value)}
          placeholder="Enter service title"
          className={cn("w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400", slimInputClassName)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Enter service description"
          rows={4}
          className={cn("w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400", slimInputClassName)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Service Image</label>
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="truncate">{imageName || "Choose image (PNG, JPG, WEBP)"}</span>
          <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">Browse</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => setImageName(event.target.files?.[0]?.name || "")}
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Vehicle Type Price Modifiers (+$)</p>
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
                value={
                  vehicleTypeModifiers[
                  vehicleType.key as keyof typeof vehicleTypeModifiers
                  ]
                }
                onChange={(event) =>
                  setVehicleTypeModifiers((prev) => ({
                    ...prev,
                    [vehicleType.key]: event.target.value,
                  }))
                }
                className={cn("w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400", slimInputClassName)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
