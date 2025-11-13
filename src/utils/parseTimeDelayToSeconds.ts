export const parseTimeDelayToSeconds = (input: any): number | null => {
  const [rawTime, ...unitParts] = input?.trim()?.toLowerCase().split(" ");
  const time = parseFloat(rawTime);
  const unit = unitParts.join(" ").replace(/s$/, "");

  const multiplier: Record<string, number> = {
    second: 1,
    minute: 60,
    hour: 60 * 60,
    day: 60 * 60 * 24,
    month: 60 * 60 * 24 * 30,
    year: 60 * 60 * 24 * 365,
  };

  const factor = multiplier[unit];

  if (!factor || isNaN(time)) return null;

  return time * factor;
};
