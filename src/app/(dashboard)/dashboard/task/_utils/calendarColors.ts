import { ServiceType } from "./calendar.types";
import { darkenHex, isHexColor, lightenHex } from "./colorUtils";

export const SERVICE_COLORS: Record<
  ServiceType,
  { gradient: string[]; accentColor: string; borderColor: string }
> = {
  Low: {
    gradient: ["#dcefdd", "#dcefdd"],
    borderColor: "rgba(76, 175, 80, 0.45)",
    accentColor: "#4CAF50",
  },
  Medium: {
    gradient: ["#ffecd6", "#ffecd6"],
    borderColor: "rgba(255, 152, 0, 0.45)",
    accentColor: "#FF9800",
  },
  High: {
    gradient: ["#fdd9d7", "#fdd9d7"],
    borderColor: "rgba(244, 67, 54, 0.45)",
    accentColor: "#f44336",
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
    gradient: ["#ffe8cc", "#ffd8a8"],
    borderColor: "rgba(234, 88, 12, 0.45)",
    accentColor: "#ea580c",
  },
  Weekend: {
    gradient: ["#ffe8cc", "#ffd8a8"],
    borderColor: "rgba(234, 88, 12, 0.35)",
    accentColor: "#ea580c",
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
