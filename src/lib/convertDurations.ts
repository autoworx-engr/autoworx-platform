import moment from "moment";

export function convertDuration(durationInMinutes: number): string {
  const duration = moment.duration(durationInMinutes, "hours");
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  return (
    `${hours ? hours + "h" : ""}${minutes ? minutes + "m" : ""}${seconds ? seconds + "s" : ""}`.trim() ||
    "0s"
  );
}

export const convertMinutesToHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const decimalMinutes = (remainingMinutes / 60).toFixed(2).substring(1);
  return `${hours}${decimalMinutes}`;
};
export function getTotalBreaksValue(totalBreaks: string | number): string {
  //special cases
  if (
    totalBreaks === "WEEKEND" ||
    totalBreaks === "HOLIDAY" ||
    totalBreaks === "-" ||
    totalBreaks === "ABSENT" ||
    totalBreaks === "LEAVE"
  ) {
    return totalBreaks;
  }
  const totalBreaksInMinutes = Number(totalBreaks);
  if (!isNaN(totalBreaksInMinutes)) {
    return convertDuration(totalBreaksInMinutes);
  }

  // Fallback for invalid data
  return "-";
}
