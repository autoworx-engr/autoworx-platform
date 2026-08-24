import { parse, startOfDay } from "date-fns";
import moment from "moment-timezone";

const MOMENT_FORMAT = "YYYY-MM-DD";
const DATE_FNS_FORMAT = "yyyy-MM-dd";

/**
 * The company's current calendar day, rebuilt as a browser-local Date.
 *
 * Calendar UIs (react-day-picker, date-fns) compare days in local time, so a
 * plain instant marks the wrong day whenever the viewer and the company sit on
 * opposite sides of the date line. Falls back to the browser's day when the
 * zone is missing or unknown.
 */
export function todayInTimezone(timezone?: string | null): Date {
  if (timezone && moment.tz.zone(timezone)) {
    const day = moment().tz(timezone).format(MOMENT_FORMAT);
    return parse(day, DATE_FNS_FORMAT, new Date());
  }
  return startOfDay(new Date());
}
