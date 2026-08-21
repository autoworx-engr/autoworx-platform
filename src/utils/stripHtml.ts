// Service descriptions can come from a plain textarea (canned services) or a
// rich-text editor (virtual shop services), so callers that display them as
// plain text need HTML stripped regardless of which source they came from.
export function stripHtml(value?: string | null): string {
  if (!value) return "";

  return value
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
