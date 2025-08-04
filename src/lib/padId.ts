export function padId(id: number | string, length: number = 9): string {
  return id.toString().padStart(length, "0");
}
