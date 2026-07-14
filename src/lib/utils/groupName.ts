// Max characters allowed for a group name. Kept here so the API, the web
// dashboard, and the mobile app all enforce the same limit.
export const GROUP_NAME_MAX_LENGTH = 50;

export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, GROUP_NAME_MAX_LENGTH);
}

export function canonicalKey(name: string): string {
  return normalizeGroupName(name).toLowerCase();
}
