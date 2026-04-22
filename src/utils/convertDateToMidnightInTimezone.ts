import moment from "moment-timezone";

export const convertDateToMidnightInTimezone = (
  date: any | null,
  timezone: string,
) => {
  // Step 1: Format date to YYYY-MM-DD only
  const dateOnly = moment(date).format("YYYY-MM-DD");

  // Step 2: Parse that date string as midnight in target timezone
  return moment.tz(`${dateOnly} 00:00:00`, "YYYY-MM-DD HH:mm:ss", timezone);
};
