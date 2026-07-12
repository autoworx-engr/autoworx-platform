export function normalizeCollaborationSearch(raw: string): string {
  return (raw ?? "").trim().replace(/^[^a-zA-Z0-9]+/, "");
}
