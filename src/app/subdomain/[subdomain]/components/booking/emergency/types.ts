export type VehicleType = "Coupe" | "Sedan" | "SUV" | "Truck";

export const VEHICLE_TYPES: Array<{
  value: VehicleType;
  label: string;
  modifierKey:
    | "modifierCoupe"
    | "modifierSedan"
    | "modifierSUV"
    | "modifierTruck";
}> = [
  { value: "Coupe", label: "Coupe", modifierKey: "modifierCoupe" },
  { value: "Sedan", label: "Sedan", modifierKey: "modifierSedan" },
  { value: "SUV", label: "SUV", modifierKey: "modifierSUV" },
  { value: "Truck", label: "Truck", modifierKey: "modifierTruck" },
];

export interface SelectedService {
  serviceId: number;
  vehicleType: VehicleType | null;
}

export interface FormState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  requestedDate: string;
  requestedTime: string;
  flexibleTiming: boolean;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
}

export const DEFAULT_FORM: FormState = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
  requestedDate: "",
  requestedTime: "",
  flexibleTiming: true,
  vehicleYear: "",
  vehicleMake: "",
  vehicleModel: "",
};

export interface SuccessData {
  requestId: number;
  estimatedReviewTime: string;
  message: string;
  trackingUrl?: string;
}
