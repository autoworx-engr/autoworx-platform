import { ServiceType } from "./types";
import { darkenHex, isHexColor, lightenHex } from "./colorUtils";

export const SERVICE_COLORS: Record<
  ServiceType,
  { gradient: string[]; accentColor: string; borderColor: string }
> = {
  Low: {
    gradient: ["#f5f3ff", "#ede9fe"],
    borderColor: "rgba(139, 92, 246, 0.45)",
    accentColor: "#6d28d9",
  },
  Medium: {
    gradient: ["#f0f9ff", "#e0f2fe"],
    borderColor: "rgba(14, 165, 233, 0.45)",
    accentColor: "#0284c7",
  },
  High: {
    gradient: ["#b2f2bb", "#d3f9d8"], // lighter greenish gradient
    borderColor: "rgba(34, 167, 184, 0.45)",
    accentColor: "#22a7b8",
  },
  Appointment: {
    gradient: ["#ccf7f5", "#b3f0ed"], // lighter teal gradient
    borderColor: "rgba(20, 133, 146, 0.45)",
    accentColor: "#0f7f8d",
  },
  Task: {
    gradient: ["#f3f4f6", "#e5e7eb"],
    borderColor: "rgba(107, 114, 128, 0.45)",
    accentColor: "#4b5563",
  },
  Holiday: {
    gradient: ["#c8f2f6", "#b8eaf0"],
    borderColor: "rgba(20, 133, 146, 0.45)",
    accentColor: "#0f7f8d",
  },
};

export const getServiceColor = (type: string, customColor?: string) => {
  if (isHexColor(customColor)) {
    return {
      gradient: [lightenHex(customColor, 0.32), lightenHex(customColor, 0.22)],
      borderColor: lightenHex(customColor, 0.55),
      accentColor: customColor,
    };
  }

  return SERVICE_COLORS[type as ServiceType] || SERVICE_COLORS["Appointment"];
};
