/**
 * Recursively searches for the 'vin' key in any object or array.
 * @param {Object|Array} obj - The dynamic object to search.
 * @returns {String|null} - The VIN value if found, otherwise null.
 */
export function findVin(obj: any): string | null {
  // 1. If the current item is not an object or is null, stop searching here
  if (obj === null || typeof obj !== "object") {
    return null;
  }

  // 2. Check if the current object has the 'vin' key (case-insensitive check optional)
  if (obj.hasOwnProperty("vin")) {
    return obj.vin;
  }

  // 3. If it's an array, iterate through its elements
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found: string | null = findVin(item);
      if (found) return found;
    }
  } else {
    // 4. If it's an object, search through all its properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const found: string | null = findVin(obj[key]);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Deep searches an object for a string that matches the 17-character VIN format.
 * @param {any} data - The dynamic AI response object.
 * @returns {string|null} - The first valid VIN found, or null.
 */
export function extractVin(data: any): string | null {
  // Standard VIN Regex: 17 alphanumeric characters, excluding I, O, and Q
  const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/i;

  // 1. If it's a string, test it against the regex
  if (typeof data === "string") {
    const match = data.match(vinRegex);
    return match ? match[0].toUpperCase() : null;
  }

  // 2. If it's an object or array, dig deeper
  if (data && typeof data === "object") {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const found = extractVin(data[key]);
        if (found) return found; // Return the first match found
      }
    }
  }

  return null;
}
