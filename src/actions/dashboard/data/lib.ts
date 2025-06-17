import moment from "moment-timezone";

export function getDateRanges(timezone: string) {
  const now = timezone ? moment.tz(timezone) : moment();

  return {
    currentMonthStart: now.clone().startOf("month").toDate(),
    currentMonthEnd: now.clone().endOf("month").toDate(),
    previousMonthStart: now
      .clone()
      .subtract(1, "month")
      .startOf("month")
      .toDate(),
    previousMonthEnd: now.clone().subtract(1, "month").endOf("month").toDate(),
    twoMonthsAgoStart: now
      .clone()
      .subtract(2, "month")
      .startOf("month")
      .toDate(),
    twoMonthsAgoEnd: now.clone().subtract(2, "month").endOf("month").toDate(),
  };
}

export function growthRate(current: number, previous: number) {
  let rate;
  if (previous === 0) {
    rate = current > 0 ? 100 : 0;
  } else {
    rate = Math.round(((current - previous) / previous) * 100);
  }

  const isPositive = rate >= 0;

  return {
    rate,
    isPositive,
  };
}

export function difference(current: number, previous: number) {
  const diff = current - previous;
  const isPositive = diff >= 0;

  return {
    rate: diff,
    isPositive,
  };
}
