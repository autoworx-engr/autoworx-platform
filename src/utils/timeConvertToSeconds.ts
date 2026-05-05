const SECONDS_IN = {
  second: 1,
  minute: 60,
  hour: 60 * 60, // 3600
  day: 24 * 60 * 60, // 86400
  month: 30.44 * 24 * 60 * 60, // ~2,629,743
  year: 365.25 * 24 * 60 * 60, // ~31,557,600
};

export function convertTimeToSeconds(timeString: string): number {
  if (timeString?.toLowerCase() === "instant") {
    return 0;
  }

  // Regex to capture value and unit, allowing for decimals
  const match = timeString.match(
    /^(\d*\.?\d+)\s+(second|minute|hour|day|month|year)s?$/i,
  );

  if (!match) {
    console.warn(`Could not parse time string: ${timeString}`);
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof SECONDS_IN;

  if (unit in SECONDS_IN) {
    // Math.round is used to ensure the final result is an integer
    return Math.round(value * SECONDS_IN[unit]);
  }

  return 0;
}

export function convertSecondsToTime(totalSeconds: number): string {
  if (totalSeconds === 0) {
    return "Instant";
  }

  // Units array, from largest to smallest, using the same constants
  const units: Array<{ name: string; seconds: number }> = [
    { name: "year", seconds: SECONDS_IN.year },
    { name: "month", seconds: SECONDS_IN.month },
    { name: "day", seconds: SECONDS_IN.day },
    { name: "hour", seconds: SECONDS_IN.hour },
    { name: "minute", seconds: SECONDS_IN.minute },
    { name: "second", seconds: SECONDS_IN.second },
  ];

  for (const unit of units) {
    // Only process if the time is at least 90% of the unit (to avoid showing "0.0 month" for 28 days)
    if (totalSeconds >= unit.seconds * 0.9) {
      let value = totalSeconds / unit.seconds;
      let formattedValue: string | number;

      // Check if the value is an integer (e.g., 1, 2, 5)
      if (Math.abs(value - Math.round(value)) < 0.001) {
        formattedValue = Math.round(value);
      } else {
        // Otherwise, format with one decimal place (e.g., 1.5)
        formattedValue = value.toFixed(1);
      }

      // Handle pluralization (e.g., "1 year" vs. "2 years")
      const numValue = parseFloat(formattedValue as string);
      const unitName = numValue === 1 ? unit.name : `${unit.name}s`;

      return `${formattedValue} ${unitName}`;
    }
  }

  // Fallback (e.g., a very small number like 5 seconds)
  return `${totalSeconds} seconds`;
}
