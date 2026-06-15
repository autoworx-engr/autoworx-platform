export function padId(id: number | string, length: number = 9): string {
  return id.toString().padStart(length, "0");
}

export function getPaddedIdSearchCondition(
  trimmed: string,
  padLength: number = 9,
): { id: number | { gte: number; lte: number } } | null {
  if (!/^\d+$/.test(trimmed)) return null;

  if (trimmed.startsWith("0") && trimmed.length <= padLength) {
    const remaining = padLength - trimmed.length;
    const base = Number(trimmed);
    const minId = base * Math.pow(10, remaining);
    const maxId = (base + 1) * Math.pow(10, remaining) - 1;
    return remaining === 0 ? { id: base } : { id: { gte: minId, lte: maxId } };
  }

  if (!trimmed.startsWith("0")) {
    const num = Number(trimmed);
    if (num <= 2147483647) return { id: num };
  }

  return null;
}
