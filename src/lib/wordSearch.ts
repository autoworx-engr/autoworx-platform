// Builds a nested Prisma where-clause for a dot-path field (e.g.
// "client.firstName" -> { client: { firstName: <leaf> } }), so callers can
// reach into to-one relations without hand-writing the nesting.
function nestedField(path: string, leaf: unknown): Record<string, any> {
  return path
    .split(".")
    .reverse()
    .reduce((acc, key) => ({ [key]: acc }), leaf as Record<string, any>);
}

// Prisma cannot run `contains` on an Int column. Callers pass the values that
// actually exist in the data as `numericValues`; the digits are matched against
// them as a substring ("20" -> 2020, 2026, 1920) and handed over as an `in`
// list. With no `numericValues` the numeric fields fall back to an exact match.
export function buildWordSearchAnd(
  search: string | undefined,
  fields: string[],
  numericFields: string[] = [],
  numericValues: number[] = [],
): Record<string, any>[] | undefined {
  if (!search) return undefined;

  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

  return words.map((word) => {
    const or: Record<string, any>[] = fields.map((field) =>
      nestedField(field, { contains: word, mode: "insensitive" }),
    );

    if (numericFields.length > 0 && /^\d+$/.test(word)) {
      const candidates = numericValues.filter((value) =>
        String(value).includes(word),
      );
      const literal = Number(word);
      if (!candidates.includes(literal)) candidates.push(literal);

      numericFields.forEach((field) => {
        or.push(nestedField(field, { in: candidates }));
      });
    }

    return { OR: or };
  });
}
