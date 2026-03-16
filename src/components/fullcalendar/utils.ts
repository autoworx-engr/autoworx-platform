import { ServiceType } from "./types";

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
};

export const getServiceColor = (type: string) => {
  return SERVICE_COLORS[type as ServiceType] || SERVICE_COLORS["Appointment"];
};
