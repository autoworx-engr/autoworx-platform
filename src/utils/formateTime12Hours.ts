import moment from "moment-timezone";
export const formatTime12Hour = (
  hour24: number,
  minute: number,
  timezone: string,
) => {
  // Create time in given timezone
  const time = moment.tz({ hour: hour24, minute }, timezone);
  return time.format("hh:mm A"); // Example: 03:15 PM
};
