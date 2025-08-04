import moment from "moment";

export function combineDateTimeWithTimezone(
  date: Date,
  timeString: string | null | undefined,
  timezone: string | null | undefined,
) {
  // Create a moment object with the date
  const momentDate = moment(date);

  // Default values if timeString is undefined or null
  let hours = 0;
  let minutes = 0;

  // Only try to parse if timeString exists
  if (timeString) {
    const timeParts = timeString.split(":");
    hours = parseInt(timeParts[0] || "0", 10);
    minutes = parseInt(timeParts[1] || "0", 10);
  }

  // Set hours and minutes
  momentDate.hours(hours).minutes(minutes).seconds(0);

  // Apply the timezone with a fallback
  return moment.tz(
    momentDate.format("YYYY-MM-DD HH:mm:ss"),
    timezone || "Etc/UTC",
  );
}
