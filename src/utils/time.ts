// ✅ Adds 1 hour while keeping 24-hour format (avoiding AM/PM mix-ups)
export const addOneHour = (time: string) => {
  let [hours, minutes] = time.split(":").map(Number);
  hours = (hours + 1) % 24; // Ensure it wraps correctly (23 → 00)
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

// ✅ Ensure this returns 24-hour format (HH:mm)
export const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`; // Ensures correct HH:mm format
};

export const formatDateToToday = (selectedDate: string) => {
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
  return formattedDate;
};

export function getHours(time: string) {
  if (!time) return 0;
  const [h, m] = time.split(":").map((x) => +x);
  return h + m / 60;
}
