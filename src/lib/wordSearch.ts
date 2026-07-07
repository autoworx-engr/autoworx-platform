/**
 * Splits a search term into words and requires each word to match at least
 * one of the given fields (AND across words, OR across fields per word).
 * This lets a multi-word query like "John Doe" match a record whose name is
 * split across separate columns (e.g. firstName/lastName), and ignores
 * leading/trailing/duplicate whitespace in the query.
 *
 * `numericFields` are matched by exact equality (e.g. an Int column like
 * `year`) instead of `contains`, and only when the word parses as an
 * integer — Prisma can't run `contains` against a non-string column.
 */
export function buildWordSearchAnd(
  search: string | undefined,
  fields: string[],
  numericFields: string[] = [],
): Record<string, any>[] | undefined {
  if (!search) return undefined;

  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

  return words.map((word) => {
    const or: Record<string, any>[] = fields.map((field) => ({
      [field]: { contains: word, mode: "insensitive" },
    }));

    if (/^\d+$/.test(word)) {
      const numericValue = Number(word);
      numericFields.forEach((field) => {
        or.push({ [field]: numericValue });
      });
    }

    return { OR: or };
  });
}
