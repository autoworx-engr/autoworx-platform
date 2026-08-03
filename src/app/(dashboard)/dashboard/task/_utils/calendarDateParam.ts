import moment from "moment";

const CALENDAR_DATE_PARAM_FORMATS = [
  "YYYY-MM-DD",
  "MM-DD-YYYY",
  "MM/DD/YYYY",
  "MMMM DD, YYYY",
  // Legacy day-first form — still parsed so existing links keep working.
  "DD MMMM YYYY",
];

export function normalizeCalendarDateParam(value: string | null) {
  if (!value) return null;

  const parsedDate = moment(value, CALENDAR_DATE_PARAM_FORMATS, true);
  return parsedDate.isValid() ? parsedDate.format("YYYY-MM-DD") : null;
}
