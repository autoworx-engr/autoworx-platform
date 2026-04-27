"use client";

import Selector from "@/app/(dashboard)/dashboard/settings/automation/components/Selector";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { cn } from "@/lib/cn";
import { Car, CheckCircle2 } from "lucide-react";
import { CustomerInfo } from "../../data/types";

export type ExistingVehicle = {
  id: number;
  year: number | null;
  make: string | null;
  model: string | null;
};

type VehicleField = "vehicleYear" | "vehicleMake" | "vehicleModel";

type CheckoutVehicleSectionProps = {
  existingVehicles: ExistingVehicle[];
  vehicleYear: CustomerInfo["vehicleYear"];
  vehicleMake: CustomerInfo["vehicleMake"];
  vehicleModel: CustomerInfo["vehicleModel"];
  onVehicleChange: (field: VehicleField, value: string) => void;
};

export function CheckoutVehicleSection({
  existingVehicles,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  onVehicleChange,
}: CheckoutVehicleSectionProps) {
  const { data: years }: any = useGetAllYears();
  const { data: makes }: any = useGetMake();
  const { data: models }: any = useGetModelsByYearAndMake(
    vehicleYear,
    vehicleMake,
  );

  const makeOptions = makes?.data?.map((v: any) => ({
    title: v.name ?? "Unknown",
    id: v.name,
  }));

  const modelOptions = models?.data?.map((v: any) => ({
    title: v.name ?? "Unknown",
    id: v.name,
  }));

  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
        Vehicle Information
      </p>

      {existingVehicles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            Vehicles on file — select to auto-fill
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {existingVehicles.map((vehicle) => {
              const year = vehicle.year != null ? String(vehicle.year) : "";
              const make = (vehicle.make || "").trim();
              const model = (vehicle.model || "").trim();
              const label = [year, make, model].filter(Boolean).join(" ");

              if (!label) return null;

              const isSelected =
                vehicleYear === year &&
                vehicleMake === make &&
                vehicleModel === model;

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => {
                    onVehicleChange("vehicleYear", year);
                    onVehicleChange("vehicleMake", make);
                    onVehicleChange("vehicleModel", model);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 w-full",
                    isSelected
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/40 bg-background",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full w-8 h-8 shrink-0",
                      isSelected ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Car className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate leading-tight",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {[make, model].filter(Boolean).join(" ") ||
                        "Unknown vehicle"}
                    </p>
                    {year && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {year}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* hint shown only when the user has opened at least one dropdown and typed something not found */}
        <p className="col-span-full text-xs text-muted-foreground">
          Can&rsquo;t find your vehicle? Type it in the search box — a{" "}
          <span className="font-medium text-foreground">
            Use &ldquo;…&rdquo;
          </span>{" "}
          option will appear so you can add it.
        </p>
        <Selector
          name="vehicleYear"
          label="Year"
          required
          placeholder="Select or type year"
          options={years?.data || []}
          value={vehicleYear}
          onChange={(value) => {
            onVehicleChange("vehicleYear", value);
            if (vehicleMake) onVehicleChange("vehicleMake", "");
            if (vehicleModel) onVehicleChange("vehicleModel", "");
          }}
          isSearch
          isClear
        />

        <Selector
          name="vehicleMake"
          label="Make"
          required
          placeholder="Select or type make"
          options={makeOptions || []}
          value={vehicleMake}
          onChange={(value) => {
            onVehicleChange("vehicleMake", value);
            if (vehicleModel) onVehicleChange("vehicleModel", "");
          }}
          isSearch
          isClear
        />

        <Selector
          name="vehicleModel"
          label="Model"
          required
          placeholder={
            !vehicleYear || !vehicleMake
              ? "Select year & make first"
              : "Select or type model"
          }
          options={modelOptions || []}
          value={vehicleModel}
          onChange={(value) => onVehicleChange("vehicleModel", value)}
          isSearch
          isClear
          disabled={!vehicleYear || !vehicleMake}
        />
      </div>
    </>
  );
}
