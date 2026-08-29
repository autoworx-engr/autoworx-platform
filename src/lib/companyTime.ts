import moment from "moment-timezone";

/**
 * Resolves "now" against the company timezone.
 *
 * A DateTime column holds an instant, so the stored value must stay UTC —
 * shifting it by the zone offset would double-shift every reader, which all
 * convert with `moment.utc(value).tz(companyTimezone)`. The timezone is used to
 * anchor the reading (and to reject a bad zone name), not to bend the value.
 */
export function companyNow(timezone?: string | null): Date {
  if (timezone && moment.tz.zone(timezone)) {
    return moment.tz(timezone).toDate();
  }
  return new Date();
}
