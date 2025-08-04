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

export default formatDateToReadable;
