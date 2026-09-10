import moment from "moment-timezone";
import { db } from "@/lib/db";

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

/**
 * The company's timezone is the single source of truth for "what day is it".
 *
 * A client-supplied zone is only a fallback: a caller can be wrong about it
 * (the mobile app serves a hardcoded default until its settings request
 * resolves), and two clients disagreeing would make the same shift look like
 * a different day to each of them.
 */
export async function resolveCompanyTimezone(
  companyId: number,
  fallback?: string | null,
): Promise<string> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });

  for (const candidate of [company?.timezone, fallback]) {
    if (candidate && moment.tz.zone(candidate)) {
      return candidate;
    }
  }
  return "UTC";
}

/**
 * Does `value` fall on the current calendar day of the company clock?
 *
 * Both sides are resolved in the same zone on purpose — comparing a stored
 * instant read in one zone against "now" read in another puts the day
 * boundary in two different places.
 */
export function isCompanyToday(
  value: Date | string | null | undefined,
  timezone: string,
): boolean {
  if (!value) {
    return false;
  }
  const zone = moment.tz.zone(timezone) ? timezone : "UTC";
  return moment.utc(value).tz(zone).isSame(moment.tz(zone), "day");
}
