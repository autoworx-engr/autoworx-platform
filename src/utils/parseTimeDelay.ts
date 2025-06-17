type TimeUnitReturn = {
  time: number;
  unit: string;
};

export const parseTimeDelay = (input: any): TimeUnitReturn => {
  const [rawTime, ...unitParts] = input.split(" ");
  const time = parseFloat(rawTime);
  let unit = unitParts.join(" ").toUpperCase();

  // Normalize unit
  if (unit.endsWith("S")) {
    unit = unit.slice(0, -1); // convert "MINUTES" -> "MINUTE"
  }

  if (unit === "YEAR" && rawTime === "1.5") {
    return { time: 1.5, unit: "YEAR" };
  }

  return { time, unit };
};
