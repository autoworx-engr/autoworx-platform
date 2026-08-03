import moment from "moment";

const CALENDAR_DATE_PARAM_FORMATS = [
  "YYYY-MM-DD",
  "MM-DD-YYYY",
  "DD MMMM YYYY",
];

export function normalizeCalendarDateParam(value: string | null) {
  if (!value) return null;

  const parsedDate = moment(value, CALENDAR_DATE_PARAM_FORMATS, true);
  return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : null;
}
