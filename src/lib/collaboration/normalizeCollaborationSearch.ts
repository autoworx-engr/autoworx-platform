/**
 * Normalizes a collaboration search string so that leading/trailing whitespace
 * and any run of internal whitespace collapse to a single space. Callers then
 * split the result on spaces to match each word independently — this makes
 * search resilient to how the user typed spaces (e.g. "Auto  worx" or
 * " Auto worx ") instead of requiring an exact substring match.
 */
export function normalizeCollaborationSearch(search: string): string {
  return (search ?? "").replace(/\s+/g, " ").trim();
}
