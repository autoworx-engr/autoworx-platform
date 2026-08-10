import type {
  VirtualShopBookingCalendarItem,
  VirtualShopServiceBookingItem,
} from "@/service/virtual-shop/api";
import type { Appointment, AppointmentStatus } from "./CalendarTab.types";

export const STATUS_DOT: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-400",
  completed: "bg-sky-500",
  cancelled: "bg-rose-400",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isSameDay(a: string, b: string) {
  return a === b;
}

export function mapStatus(status?: string | null): AppointmentStatus {
  const normalized = (status || "").toLowerCase();

  if (normalized === "confirmed") return "confirmed";
  if (normalized === "pending") return "pending";
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled") return "cancelled";

  return "pending";
}

export function formatTime(value?: string | null) {
  if (!value) return "-";

  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function extractDateKey(value?: string | null) {
  if (!value) return "";
  return value.split("T")[0];
}

export function mapVehicleLabel(
  vehicle?: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
  } | null,
) {
  if (!vehicle) return "Vehicle not provided";

  const segments = [vehicle.year, vehicle.make, vehicle.model]
    .map((part) => (part ?? "").toString().trim())
    .filter(Boolean);

  return segments.length > 0 ? segments.join(" ") : "Vehicle not provided";
}

export function mapBookingToAppointment(
  item: VirtualShopServiceBookingItem,
): Appointment {
  const firstName = item?.client?.firstName || "";
  const lastName = item?.client?.lastName || "";
  const clientName = `${firstName} ${lastName}`.trim() || "Unknown Client";

  return {
    id: Number(item?.id || 0),
    clientName,
    status: mapStatus(item?.status),
    date: extractDateKey(item?.appointment?.date),
    startTime: formatTime(item?.appointment?.startTime),
    endTime: formatTime(item?.appointment?.endTime),
    vehicle: mapVehicleLabel(item?.vehicle),
    services: Array.isArray(item?.services)
      ? item.services.map((service) => ({
          name: service?.title || "Service",
          vehicleType: service?.modifierType || "Vehicle",
          price: Number(service?.price || 0),
          extraFee: Number(service?.modifierPrice || 0),
        }))
      : [],
  };
}

export function mapCalendarItemToAppointment(
  item: VirtualShopBookingCalendarItem,
): Appointment {
  return {
    id: Number(item.id),
    clientName:
      `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim() ||
      "Unknown Client",
    status: mapStatus(item.status),
    date: extractDateKey(item.appointment?.date),
    startTime: formatTime(item.appointment?.startTime),
    endTime: formatTime(item.appointment?.endTime),
    vehicle: "Vehicle not provided",
    services: [],
  };
}

export function getTotalRevenue(appt: Appointment) {
  return appt.services.reduce((sum, s) => sum + s.price + s.extraFee, 0);
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
