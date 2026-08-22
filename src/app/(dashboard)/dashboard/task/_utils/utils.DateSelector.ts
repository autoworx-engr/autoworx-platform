import moment from "moment";

export const getWeekStartNumber = (weekStart: string | number) => {
  if (typeof weekStart === "number") return weekStart;
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days.indexOf(weekStart);
};

// Function to get current week info with proper week start
export const getCurrentWeekInfo = (weekStart = 1) => {
  // Apply the week start setting
  moment.updateLocale("en", {
    week: {
      dow: getWeekStartNumber(weekStart), // Set the start of the week
    },
  });

  const now = moment();
  const weekNumber = now.week();
  const weekYear = now.weekYear();
  const weekStr = `${weekYear}-W${weekNumber.toString().padStart(2, "0")}`;

  // Calculate start and end of week
  const startOfWeek = moment(now).startOf("week");
  const endOfWeek = moment(now).endOf("week");

  return {
    weekStr,
    weekNumber,
    weekYear,
    startDate: startOfWeek.format("YYYY-MM-DD"),
    endDate: endOfWeek.format("YYYY-MM-DD"),
    displayRange: `${startOfWeek.format("MMM DD")} - ${endOfWeek.format("MMM DD, YYYY")}`,
  };
};

// Function to parse week string and get week info
export const getWeekInfoFromWeekStr = (
  weekStr: string,
  weekStart: number | string = 1,
) => {
  // Apply the week start setting
  moment.updateLocale("en", {
    week: {
      dow: getWeekStartNumber(weekStart),
    },
  });

  const [year, weekNum] = weekStr.split("-W").map(Number);

  // Create a moment for the specified week
  const weekMoment = moment().year(year).week(weekNum);
  const startOfWeek = moment(weekMoment).startOf("week");
  const endOfWeek = moment(weekMoment).endOf("week");

  return {
    weekStr,
    weekNumber: weekNum,
    weekYear: year,
    startDate: startOfWeek.format("YYYY-MM-DD"),
    endDate: endOfWeek.format("YYYY-MM-DD"),
    displayRange: `${startOfWeek.format("MMM DD")} - ${endOfWeek.format("MMM DD, YYYY")}`,
  };
};

/**
 * Week range for the week *containing* `date`, anchored on `weekStart`.
 */
export const getWeekInfoFromDate = (
  date: string | null | undefined,
  weekStart: number | string = 1,
) => {
  const dow = getWeekStartNumber(weekStart);
  // Fall back to the current week when the store has no date yet.
  const anchor = date ? moment(date, "YYYY-MM-DD") : moment();
  const base = anchor.isValid() ? anchor : moment();

  const startOfWeek = base.clone().day(dow);
  if (startOfWeek.isAfter(base, "day")) startOfWeek.subtract(7, "day");
  const endOfWeek = startOfWeek.clone().add(6, "day");

  return {
    weekStr: `${startOfWeek.weekYear()}-W${String(startOfWeek.week()).padStart(2, "0")}`,
    startDate: startOfWeek.format("YYYY-MM-DD"),
    endDate: endOfWeek.format("YYYY-MM-DD"),
    displayRange: `${startOfWeek.format("MMM DD")} - ${endOfWeek.format("MMM DD, YYYY")}`,
  };
};

export function getDayNumber(dayName: string) {
  const dayNumber = moment().day(dayName).day(); // `day()` accepts the day name
  return isNaN(dayNumber) ? -1 : dayNumber;
}
