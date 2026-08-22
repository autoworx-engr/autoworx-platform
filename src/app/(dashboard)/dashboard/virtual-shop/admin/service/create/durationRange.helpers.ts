import dayjs, { type Dayjs } from "dayjs";

export const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_OFFSET_MINUTES = 60;

export const toMinutes = (timeValue: string) => {
  const [hourString, minuteString] = timeValue.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
};

export const minutesToTime = (minutes: number) => {
  const safe = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const getDurationFromRange = (startTime: string, endTime: string) => {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return endMinutes - startMinutes;
};

export const toPickerValue = (timeValue: string) => {
  const totalMinutes = toMinutes(timeValue);

  if (totalMinutes === null) {
    return null;
  }

  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
};

export const toTimeString = (timeValue: Dayjs | null) => {
  if (!timeValue) {
    return "";
  }

  return `${String(timeValue.hour()).padStart(2, "0")}:${String(
    timeValue.minute(),
  ).padStart(2, "0")}`;
};

export const getInitialRangeFromDuration = (durationValue: string) => {
  const parsedDuration = Number.parseInt(durationValue, 10);
  const startMinutes = toMinutes(DEFAULT_START_TIME) ?? 0;

  if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
    return {
      startTime: DEFAULT_START_TIME,
      endTime: minutesToTime(startMinutes + DEFAULT_END_OFFSET_MINUTES),
    };
  }

  return {
    startTime: DEFAULT_START_TIME,
    endTime: minutesToTime(startMinutes + parsedDuration),
  };
};
