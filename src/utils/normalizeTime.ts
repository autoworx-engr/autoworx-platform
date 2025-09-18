import moment from "moment";

export function normalizeTime(time: string) {
  // Try 24-hour
  let m = moment(time, "HH:mm", true);
  if (!m.isValid()) {
    // Try 12-hour
    m = moment(time, "h:mm A", true);
  }
  return m.isValid() ? m : null;
}
