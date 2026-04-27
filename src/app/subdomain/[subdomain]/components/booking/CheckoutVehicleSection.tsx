import { Button } from "@/components/ui/button";
import { SlimInput } from "@/components/SlimInput";
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
  const suggestedVehicleYears = Array.from(
    new Set(
      existingVehicles
        .map((vehicle) =>
          vehicle.year !== null && vehicle.year !== undefined
            ? String(vehicle.year)
            : "",
        )
        .filter(Boolean),
    ),
  );

  const suggestedVehicleMakes = Array.from(
    new Set(
      existingVehicles
        .map((vehicle) => (vehicle.make || "").trim())
        .filter(Boolean),
    ),
  );

  const suggestedVehicleModels = Array.from(
    new Set(
      existingVehicles
        .map((vehicle) => (vehicle.model || "").trim())
        .filter(Boolean),
    ),
  );

  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
        Vehicle Information
      </p>

      {existingVehicles.length > 0 && (
        <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Existing vehicles found for this phone. Select one or type a new
            vehicle below.
          </p>
          <div className="flex flex-wrap gap-2">
            {existingVehicles.map((vehicle) => {
              const year =
                vehicle.year !== null && vehicle.year !== undefined
                  ? String(vehicle.year)
                  : "";
              const make = (vehicle.make || "").trim();
              const model = (vehicle.model || "").trim();
              const label = [year, make, model].filter(Boolean).join(" ");

              if (!label) return null;

              return (
                <Button
                  key={vehicle.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onVehicleChange("vehicleYear", year);
                    onVehicleChange("vehicleMake", make);
                    onVehicleChange("vehicleModel", model);
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SlimInput
          id="vehicleYear"
          name="vehicleYear"
          label="Year"
          required
          labelClassName="text-xs font-medium"
          className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
          value={vehicleYear}
          onChange={(e) => onVehicleChange("vehicleYear", e.target.value)}
          placeholder="e.g. 2020"
          inputMode="numeric"
          list="existing-vehicle-years"
        />

        <SlimInput
          id="vehicleMake"
          name="vehicleMake"
          label="Make"
          required
          labelClassName="text-xs font-medium"
          className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
          value={vehicleMake}
          onChange={(e) => onVehicleChange("vehicleMake", e.target.value)}
          placeholder="e.g. Toyota"
          list="existing-vehicle-makes"
        />

        <SlimInput
          id="vehicleModel"
          name="vehicleModel"
          label="Model"
          required
          labelClassName="text-xs font-medium"
          className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
          value={vehicleModel}
          onChange={(e) => onVehicleChange("vehicleModel", e.target.value)}
          placeholder="e.g. Camry"
          list="existing-vehicle-models"
        />
      </div>

      <datalist id="existing-vehicle-years">
        {suggestedVehicleYears.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="existing-vehicle-makes">
        {suggestedVehicleMakes.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="existing-vehicle-models">
        {suggestedVehicleModels.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}
