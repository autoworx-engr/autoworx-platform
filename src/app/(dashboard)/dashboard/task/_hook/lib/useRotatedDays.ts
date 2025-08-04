import { useEffect, useState } from "react";

export default function useRotatedDays(startDay: number) {
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  useEffect(() => {
    const updateDaysOfWeek = () => {
      setDaysOfWeek(
        window.innerWidth < 640
          ? ["S", "M", "T", "W", "T", "F", "S"]
          : window.innerWidth < 1024
            ? ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"]
            : [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ],
      );
    };

    updateDaysOfWeek(); // Set initial value
    window.addEventListener("resize", updateDaysOfWeek);

    return () => window.removeEventListener("resize", updateDaysOfWeek);
  }, []);

  // Rotate the daysOfWeek array based on the selected start day
  const rotatedDays = daysOfWeek
    .slice(startDay)
    .concat(daysOfWeek.slice(0, startDay));
  return rotatedDays;
}
