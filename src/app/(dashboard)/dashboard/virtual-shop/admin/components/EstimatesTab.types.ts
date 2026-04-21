export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";
export type FilterStatus = "all" | AppointmentStatus;

export type EstimateService = {
  name: string;
  vehicleType: string;
  basePrice: number;
  adjustment: number;
  durationMinutes: number;
};

export type Estimate = {
  id: number;
  clientName: string;
  status: AppointmentStatus;
  date: string;
  time: string;
  duration: string;
  vehicle: string;
  services: EstimateService[];
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  total: number;
};
