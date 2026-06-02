export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function canonicalKey(name: string): string {
  return normalizeGroupName(name).toLowerCase();
}
