// Builds a nested Prisma where-clause for a dot-path field (e.g.
// "client.firstName" -> { client: { firstName: <leaf> } }), so callers can
// reach into to-one relations without hand-writing the nesting.
function nestedField(path: string, leaf: unknown): Record<string, any> {
  return path
    .split(".")
    .reverse()
    .reduce((acc, key) => ({ [key]: acc }), leaf as Record<string, any>);
}

export function buildWordSearchAnd(
  search: string | undefined,
  fields: string[],
  numericFields: string[] = [],
): Record<string, any>[] | undefined {
  if (!search) return undefined;

  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

  return words.map((word) => {
    const or: Record<string, any>[] = fields.map((field) =>
      nestedField(field, { contains: word, mode: "insensitive" }),
    );

    if (/^\d+$/.test(word)) {
      const numericValue = Number(word);
      numericFields.forEach((field) => {
        or.push(nestedField(field, numericValue));
      });
    }

    return { OR: or };
  });
}
