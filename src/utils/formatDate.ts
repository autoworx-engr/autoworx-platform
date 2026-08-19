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
 * Plain "YYYY-MM-DD" strings (no time or timezone component) are parsed
 * literally so the displayed date never shifts by a day depending on the
 * runtime timezone.
 */
export function fUsDate(value: DatePickerFormat) {
  if (!value) return null;

  const parsed =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? moment(value, "YYYY-MM-DD")
      : moment(value);

  return parsed.isValid() ? parsed.format("MM/DD/YYYY") : null;
}

export default formatDateToReadable;
