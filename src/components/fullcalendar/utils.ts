import { ServiceType } from "./types";

export const SERVICE_COLORS: Record<
  ServiceType,
  { bg: string; text: string; border: string }
> = {
  Tint: {
    bg: "#dbeafe", // blue-100
    text: "#2563eb", // blue-600
    border: "#93c5fd", // blue-300
  },
  Detailing: {
    bg: "#f3e8ff", // purple-100
    text: "#9333ea", // purple-600
    border: "#d8b4fe", // purple-300
  },
  PPF: {
    bg: "#dcfce7", // green-100
    text: "#16a34a", // green-600
    border: "#86efac", // green-300
  },
  Wrap: {
    bg: "#ffedd5", // orange-100
    text: "#ea580c", // orange-600
    border: "#fdba74", // orange-300
  },
  "Custom Work": {
    bg: "#fee2e2", // red-100
    text: "#dc2626", // red-600
    border: "#fca5a5", // red-300
  },
};

export const getServiceColor = (type: string) => {
  return SERVICE_COLORS[type as ServiceType] || SERVICE_COLORS["Custom Work"];
};
