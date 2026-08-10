import formatDateToReadable from "./formatDate";

describe("formatDateToReadable", () => {
  it("formats user-visible dates in US month-day-year order", () => {
    const date = new Date(2026, 7, 21);

    expect(formatDateToReadable(date)).toBe("August 21, 2026");
  });
});
