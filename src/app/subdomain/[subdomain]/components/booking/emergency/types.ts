export const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical", desc: "Immediate safety issue" },
  { value: "URGENT", label: "Urgent", desc: "Same-day needed" },
  { value: "HIGH", label: "High", desc: "24–48 hours" },
  { value: "NORMAL", label: "Normal", desc: "Within a week" },
] as const;

export const REASON_CATEGORIES = [
  { value: "ACCIDENT_DAMAGE", label: "Accident Damage" },
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "SAFETY_CONCERN", label: "Safety Concern" },
  { value: "PRE_TRAVEL_CHECK", label: "Pre-Travel Check" },
  { value: "WEATHER_DAMAGE", label: "Weather Damage" },
  { value: "TOWING_RELATED", label: "Towing Related" },
  { value: "SCHEDULED_CONFLICT", label: "Scheduling Conflict" },
  { value: "OTHER", label: "Other" },
] as const;

export const URGENCY_COLORS: Record<string, string> = {
  CRITICAL:
    "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  URGENT:
    "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400",
  HIGH: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400",
  NORMAL: "border-primary bg-primary/10 text-primary",
};

export type UrgencyLevel = "CRITICAL" | "URGENT" | "HIGH" | "NORMAL";

export interface FormState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  urgencyLevel: UrgencyLevel;
  reasonCategory: string;
  description: string;
  requestedDate: string;
  requestedTime: string;
  flexibleTiming: boolean;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  selectedServiceIds: number[];
}

export const DEFAULT_FORM: FormState = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  urgencyLevel: "URGENT",
  reasonCategory: "BREAKDOWN",
  description: "",
  requestedDate: "",
  requestedTime: "",
  flexibleTiming: true,
  vehicleYear: "",
  vehicleMake: "",
  vehicleModel: "",
  selectedServiceIds: [],
};

export interface SuccessData {
  requestId: number;
  estimatedReviewTime: string;
  message: string;
}
