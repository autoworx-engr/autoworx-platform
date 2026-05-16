import { Prisma } from "@prisma/client";

/**
 * Build a Prisma `User.where` clause for a free-text search across the fields
 * the internal sidebar / search box look at. Tokens are AND'd, fields are OR'd
 * so "alice ex" matches "Alice" + "example.com".
 *
 * Returns `{}` when the search term is empty so callers can spread it
 * unconditionally:
 *
 *   where: { companyId, ...buildUserSearchWhere(search) }
 */
export function buildUserSearchWhere(
  searchTerm: string | undefined | null,
): Prisma.UserWhereInput {
  const trimmed = searchTerm?.trim() ?? "";
  if (!trimmed) return {};

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};

  return {
    AND: tokens.map((token) => ({
      OR: [
        { firstName: { contains: token, mode: "insensitive" as const } },
        { lastName: { contains: token, mode: "insensitive" as const } },
        { email: { contains: token, mode: "insensitive" as const } },
        { phone: { contains: token } },
      ],
    })),
  };
}
