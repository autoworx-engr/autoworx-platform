import moment from "moment";

export function parseDbTime(time: string) {
  let m = moment(time, "HH:mm", true);
  if (!m.isValid()) {
    m = moment(time, "h:mm A", true);
  }
  return m.isValid() ? m.format("HH:mm") : "";
}
