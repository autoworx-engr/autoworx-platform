import moment, { Moment } from "moment";

export type DatePickerFormat =
  | Moment
  | Date
  | string
  | number
  | null
  | undefined;

function formatDateToReadable(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** output: a few seconds, 2 years
 */
export function fToNow(date: DatePickerFormat) {
  if (!date) {
    return null;
  }

  const isValid = moment(date).isValid();

  return isValid ? moment(date).fromNow(true) : "Invalid time value";
}

/** US date format — output: 08/05/2026
 *
 * Read in UTC. Every date we show apart from createdAt / updatedAt is a
 * calendar day stored as midnight UTC (expiry dates, requested dates, ...), so
 * formatting in the runtime timezone rendered the day before for anyone behind
 * UTC. Plain "YYYY-MM-DD" strings are parsed literally for the same reason.
 */
export function fUsDate(value: DatePickerFormat) {
  if (!value) return null;

  const parsed =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? moment.utc(value, "YYYY-MM-DD")
      : moment.utc(value);

  return parsed.isValid() ? parsed.format("MM/DD/YYYY") : null;
}

export default formatDateToReadable;
