import { normalizeCalendarDateParam } from "./calendarDateParam";

describe("normalizeCalendarDateParam", () => {
  it.each([
    ["2026-08-21", "2026-08-21"],
    ["08-21-2026", "2026-08-21"],
    ["21 August 2026", "2026-08-21"],
  ])("normalizes notification date %s", (value, expected) => {
    expect(normalizeCalendarDateParam(value)).toBe(expected);
  });

  it.each([null, "", "not-a-date", "2026-02-30"])(
    "rejects invalid date %s",
    (value) => {
      expect(normalizeCalendarDateParam(value)).toBeNull();
    },
  );
});
