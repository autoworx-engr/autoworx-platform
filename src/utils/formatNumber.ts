export function formatNumber(number: number | string | undefined) {
  if (number === undefined || number === null) {
    return undefined; // Handle undefined/null cases gracefully
  }

  const numStr = number.toString().trim();

  if (isNaN(Number(numStr))) {
    return "Invalid"; // Handle non-numeric input
  }

  // If number contains a decimal point, format to 2 decimal places
  if (numStr.includes(".")) {
    return Number(numStr).toFixed(2);
  }

  // Return original number as a string if no decimal point
  return numStr;
}
