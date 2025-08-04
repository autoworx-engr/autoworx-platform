export const parseSecondsToTimeDelay = (seconds: number): string | null => {
  if (isNaN(seconds) || seconds < 0) return null;

  const units = [
    { label: "year", seconds: 60 * 60 * 24 * 365 },
    { label: "month", seconds: 60 * 60 * 24 * 30 },
    { label: "day", seconds: 60 * 60 * 24 },
    { label: "hour", seconds: 60 * 60 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const unit of units) {
    if (seconds % unit.seconds === 0) {
      const value = seconds / unit.seconds;
      const label = value === 1 ? unit.label : `${unit.label}s`;
      return `${value} ${label}`;
    }
  }

  return null; // if no clean match
};
