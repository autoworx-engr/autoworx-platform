export type VehicleType = "Coupe" | "Sedan" | "SUV" | "Truck";

export interface VehicleTypePricing {
  coupe: number;
  sedan: number;
  suv: number;
  truck: number;
}

export interface Service {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  price: number;
  estimatedMinutes: number;
  category: string;
  images: string[];
  vehicleTypePricing: VehicleTypePricing;
}

export interface CartItem {
  service: Service;
  quantity: number;
  vehicleType: VehicleType;
}

export interface TimeSlot {
  time: string;
  label: string;
  period: "Morning" | "Afternoon" | "Evening";
  available: boolean;
}

export interface BookingData {
  services: CartItem[];
  date: Date | null;
  timeSlot: TimeSlot | null;
  customer: CustomerInfo | null;
}

export interface BookingTotals {
  subtotal: number;
  tax: number;
  serviceFee: number;
  grandTotal: number;
  giftCardRedeemed?: number;
  depositRequired?: number;
  depositPaid?: number;
  balanceDue?: number;
}

export interface BookedAppointment {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  date: string; // ISO date string
  timeSlot: TimeSlot;
  status: "confirmed" | "completed" | "cancelled";
  createdAt: string;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  notes: string;
}

export interface ShopSettings {
  depositRequired: boolean;
  depositType: "fixed" | "percentage";
  depositAmount: number;
  stackingEnabled: boolean;
  stackingLimit: number;
  slotIntervalMinutes: number;
  shopFeeEnabled: boolean;
  shopFeePercent: number;
  taxEnabled: boolean;
  taxPercent: number;
  dayAvailability: DayAvailability[];
}

export interface DayAvailability {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export type BookingStep = "services" | "datetime" | "checkout" | "confirmation";
