import moment from "moment-timezone";

// ✅ Adds 1 hour while keeping 24-hour format (avoiding AM/PM mix-ups)
export const addOneHour = (time: string) => {
  let [hours, minutes] = time.split(":").map(Number);
  hours = (hours + 1) % 24; // Ensure it wraps correctly (23 → 00)
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

// ✅ Adds N minutes in 24-hour format, clamping at 23:59 instead of wrapping
// past midnight (a same-day end time must never land before its start).
export const addMinutes = (time: string, minutesToAdd: number) => {
  const [hours, minutes] = time.split(":").map(Number);
  const total = Math.min(hours * 60 + minutes + minutesToAdd, 23 * 60 + 59);
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

// ✅ Get current time in company timezone
export const getCurrentTime = (timezone?: string) => {
  const now = moment.tz(timezone || moment.tz.guess());
  return now.format("HH:mm"); // Ensures correct HH:mm format in company timezone
};

// ✅ Get current date in company timezone
export const getCurrentDate = (timezone?: string) => {
  const now = moment.tz(timezone || moment.tz.guess());
  return now.format("YYYY-MM-DD");
};

export const formatDateToToday = (selectedDate: string, timezone?: string) => {
  const today = moment.tz(timezone || moment.tz.guess());
  return today.format("YYYY-MM-DD");
};

export function getHours(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(":").map((x) => +x);
  return h + m / 60;
}
