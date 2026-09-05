import { getDateRanges } from "@/actions/dashboard/data/lib";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import moment from "moment-timezone";

export type History = {
  dateClosed: string | null | Date;
  amount: string | null | number;
  status: string;
};

export async function calculatePreviousMonthEarnings(histories: History[]) {
  const { timezone } = await getCompanyTimezone();

  // Get previous month boundaries in the company's timezone, then convert to UTC
  const prevMonthStart = moment
    .tz(timezone)
    .subtract(1, "month")
    .startOf("month")
    .utc();

  const prevMonthEnd = moment
    .tz(timezone)
    .subtract(1, "month")
    .endOf("month")
    .utc();

  // Filter the histories for previous month completed tasks
  const previousMonthEarnings = histories.reduce((sum, history) => {
    const historyDate = history.dateClosed
      ? moment.utc(history.dateClosed)
      : null;

    if (
      history.status === "Complete" &&
      historyDate !== null &&
      historyDate.isBetween(prevMonthStart, prevMonthEnd, null, "[]")
    ) {
      return sum + Number(history?.amount || 0);
    }
    return sum;
  }, 0);

  return previousMonthEarnings;
}
// calculate the previous month's previous month earnings

export async function calculate2ndPreviousMonthEarnings(histories: History[]) {
  const { timezone } = await getCompanyTimezone();

  const { twoMonthsAgoStart, twoMonthsAgoEnd } = getDateRanges(timezone);
  const secondPreviousMonthEarnings = histories.reduce((sum, history) => {
    const historyDate = history.dateClosed
      ? moment.utc(history.dateClosed)
      : null;

    if (
      history.status === "Complete" &&
      historyDate !== null &&
      historyDate.isSameOrAfter(twoMonthsAgoStart) &&
      historyDate.isSameOrBefore(twoMonthsAgoEnd)
    ) {
      return sum + Number(history?.amount || 0);
    }
    return sum;
  }, 0);

  return secondPreviousMonthEarnings;
}

export async function calculateCurrentMonthEarnings(technicians: History[]) {
  const { timezone } = await getCompanyTimezone();

  // Get current month boundaries in the company's timezone, then convert to UTC
  const nowInTimezone = moment.tz(timezone);
  const currentMonthStart = moment.tz(timezone).startOf("month").utc();
  const currentMonthEnd = moment.tz(timezone).endOf("month").utc();

  // Filter the technicians who closed tasks in the current month
  const currentMonthEarnings = technicians.reduce((sum, tech) => {
    const techDate = tech.dateClosed ? moment.utc(tech.dateClosed) : null;

    if (
      tech.status === "Complete" &&
      techDate !== null &&
      techDate.isBetween(currentMonthStart, currentMonthEnd, null, "[]")
    ) {
      return sum + Number(tech?.amount || 0);
    }
    return sum;
  }, 0);

  return currentMonthEarnings;
}

export function calculateTotalEarnings(histories: History[]) {
  // Filter the technicians who have closed tasks
  const totalEarnings = histories.reduce((total, history) => {
    if (history.status === "Complete" && history.dateClosed) {
      return total + Number(history.amount || 0);
    }
    return total;
  }, 0);

  return totalEarnings;
}
