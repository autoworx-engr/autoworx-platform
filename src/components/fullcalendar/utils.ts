import { ServiceType } from "./types";
import { hexToRgba, isHexColor } from "./colorUtils";

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
    gradient: ["#fef3c7", "#fef9c3"], // lighter yellow gradient
    borderColor: "rgba(245, 158, 11, 0.45)",
    accentColor: "#f59e0b",
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
      gradient: [hexToRgba(customColor, 0.32), hexToRgba(customColor, 0.22)],
      borderColor: hexToRgba(customColor, 0.55),
      accentColor: customColor,
    };
  }

  return SERVICE_COLORS[type as ServiceType] || SERVICE_COLORS["Appointment"];
};
