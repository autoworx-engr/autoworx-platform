import moment from "moment";

export const SLOT_MINUTES = 15;
export const MINUTES_PER_HOUR = 60;
export const TOTAL_MINUTES = 24 * 60;
export const SLOTS_PER_HOUR = MINUTES_PER_HOUR / SLOT_MINUTES;
export const TOTAL_SLOTS = TOTAL_MINUTES / SLOT_MINUTES;

export const SLOT_WIDTH_PX = 28;
export const HOUR_WIDTH_PX = SLOT_WIDTH_PX * SLOTS_PER_HOUR;
export const DAY_ROW_HEIGHT_PX = 126;
export const LANE_HEIGHT_PX = 56;
export const DAY_LABEL_WIDTH_PX = 96;

export const rowHeightForLanes = (lanes: number): number =>
  Math.max(DAY_ROW_HEIGHT_PX, lanes * LANE_HEIGHT_PX);

const DAY_NAME_TO_DOW: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const weekendNamesToDow = (names: string[]): Set<number> =>
  new Set(
    names
      .map((n) => DAY_NAME_TO_DOW[n.toLowerCase()])
      .filter((n) => n !== undefined),
  );

export const parseTimeToMinutes = (t: string | null | undefined) => {
  if (!t) return 0;
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

export const minutesToTimeString = (mins: number) => {
  const clamped = Math.max(0, Math.min(TOTAL_MINUTES - SLOT_MINUTES, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const dateToMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const minutesToPixels = (mins: number) =>
  (mins / SLOT_MINUTES) * SLOT_WIDTH_PX;

export const pixelsToMinutes = (px: number) => {
  const slots = Math.round(px / SLOT_WIDTH_PX);
  return slots * SLOT_MINUTES;
};

export const getWeekDays = (anchor: moment.Moment, firstDay: number) => {
  const start = anchor.clone().day(firstDay);
  if (start.isAfter(anchor, "day")) start.subtract(7, "day");
  return Array.from({ length: 7 }, (_, i) => start.clone().add(i, "day"));
};

export const formatSlotLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

export const isSameDay = (a: Date, b: moment.Moment) =>
  moment(a).format("YYYY-MM-DD") === b.format("YYYY-MM-DD");
