import moment from "moment-timezone";

export function getDateRanges(timezone: string) {
  const resolvedTimezone = timezone;
  const now = moment.tz(resolvedTimezone);
  const currentMonthStart = now.clone().startOf("month").startOf("day");
  const currentMonthEnd = now
    .clone()
    .add(1, "month")
    .startOf("month")
    .subtract(1, "second");

  const previousMonthStart = now
    .clone()
    .subtract(1, "month")
    .startOf("month")
    .startOf("day");

  const previousMonthEnd = previousMonthStart
    .clone()
    .add(1, "month")
    .startOf("day")
    .subtract(1, "second");

  const twoMonthsAgoStart = now
    .clone()
    .subtract(2, "month")
    .startOf("month")
    .startOf("day");

  const twoMonthsAgoEnd = twoMonthsAgoStart
    .clone()
    .add(1, "month")
    .startOf("day")
    .subtract(1, "second");

  return {
    currentMonthStart: currentMonthStart.toDate(),
    currentMonthEnd: currentMonthEnd.toDate(),
    previousMonthStart: previousMonthStart.toDate(),
    previousMonthEnd: previousMonthEnd.toDate(),
    twoMonthsAgoStart: twoMonthsAgoStart.toDate(),
    twoMonthsAgoEnd: twoMonthsAgoEnd.toDate(),
  };
}

// Helper function to convert a date to midnight in the specified timezone
// export const convertDateToMidnightInTimezone = (
//   date: Date | null,
//   timezone: string
// ) => {
//   if (!date) {
//     return null;
//   }
//   // Step 1: Format date to YYYY-MM-DD only
//   const dateOnly = moment(date).format("YYYY-MM-DD");

//   // Step 2: Parse that date string as midnight in target timezone
//   return moment.tz(`${dateOnly} 00:00:00`, "YYYY-MM-DD HH:mm:ss", timezone);
// };

// // Helper function to convert a date to 23:59:59 in the specified timezone
// export const convertDateToEndOfDayInTimezone = (
//   date: Date | null,
//   timezone: string
// ) => {
//   if (!date) {
//     return null;
//   }
//   // Step 1: Format date to YYYY-MM-DD only
//   const dateOnly = moment(date).format("YYYY-MM-DD");

//   // Step 2: Parse that date string as 23:59:59 in target timezone
//   return moment.tz(`${dateOnly} 23:59:59`, "YYYY-MM-DD HH:mm:ss", timezone);
// };

// export function getDateRanges(timezone: string) {
//   const now = moment.tz(timezone);

//   // Current Month
//   const currentMonthStartMoment = now.clone().startOf("month");
//   const currentMonthEndMoment = now.clone().endOf("month");

//   // Previous Month
//   const previousMonthStartMoment = now
//     .clone()
//     .subtract(1, "month")
//     .startOf("month");
//   const previousMonthEndMoment = now
//     .clone()
//     .subtract(1, "month")
//     .endOf("month");

//   // Two Months Ago
//   const twoMonthsAgoStartMoment = now
//     .clone()
//     .subtract(2, "month")
//     .startOf("month");
//   const twoMonthsAgoEndMoment = now.clone().subtract(2, "month").endOf("month");

//   return {
//     currentMonthStart: convertDateToMidnightInTimezone(
//       currentMonthStartMoment.toDate(),
//       timezone
//     )?.toDate(),
//     currentMonthEnd: convertDateToEndOfDayInTimezone(
//       currentMonthEndMoment.toDate(),
//       timezone
//     )?.toDate(),
//     previousMonthStart: convertDateToMidnightInTimezone(
//       previousMonthStartMoment.toDate(),
//       timezone
//     )?.toDate(),
//     previousMonthEnd: convertDateToEndOfDayInTimezone(
//       previousMonthEndMoment.toDate(),
//       timezone
//     )?.toDate(),
//     twoMonthsAgoStart: convertDateToMidnightInTimezone(
//       twoMonthsAgoStartMoment.toDate(),
//       timezone
//     )?.toDate(),
//     twoMonthsAgoEnd: convertDateToEndOfDayInTimezone(
//       twoMonthsAgoEndMoment.toDate(),
//       timezone
//     )?.toDate(),
//   };
// }

const MAX_GROWTH_RATE = 999;

export function growthRate(current: number, previous: number) {
  let rate = 0;
  if (previous === 0) {
    rate = current > 0 ? 100 : 0;
  } else {
    rate = Math.round(((current - previous) / previous) * 100);
    rate = Math.max(-MAX_GROWTH_RATE, Math.min(MAX_GROWTH_RATE, rate));
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
