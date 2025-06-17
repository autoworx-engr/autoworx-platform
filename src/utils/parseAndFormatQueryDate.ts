import moment from "moment-timezone";
import { FormatUtcToTimezone } from "./FormatUtcToTimezone";

export const parseAndFormatQueryDate = (
  encodedDate: string,
  timezone: string,
  inputFormat: string = "MM-DD-YYYY",
  outputFormat: string = "YYYY-MM-DD",
): string | Date => {
  const decoded = decodeURIComponent(encodedDate);
  const parsed = moment(decoded, inputFormat);

  if (!parsed.isValid()) return "Invalid date";

  return FormatUtcToTimezone(parsed.toDate(), timezone, outputFormat);
};
