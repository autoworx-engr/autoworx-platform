import { Prisma } from "@prisma/client";

export function searchWords(term: string): string[] {
  return term.trim().split(/\s+/).filter(Boolean);
}

export function clientNameFilter(
  term: string,
): Prisma.ClientWhereInput | undefined {
  const words = searchWords(term);
  if (words.length === 0) return undefined;

  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
      ],
    })),
  };
}
