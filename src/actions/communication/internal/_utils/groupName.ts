import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Canonical form of a group name used for both storage and uniqueness checks:
 * trim ends + collapse runs of whitespace to a single space. So "TA   f " and
 * " ta  f" both normalize to "TA f" / "ta f" before case folding.
 */
export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function canonicalKey(name: string): string {
  return normalizeGroupName(name).toLowerCase();
}

/**
 * Looks up a group in the same company whose name (after normalization +
 * case-folding) matches `candidateName`. Returns the conflicting row or null.
 *
 * Why two steps:
 *  - Postgres `equals` matches the raw stored value, which means legacy rows
 *    with stray whitespace (e.g. "TA ") slip past `equals: "TA"`.
 *  - We fetch a wider candidate set via `contains` (which uses an index when
 *    one is present) then filter exactly in JS using the canonical key.
 */
export async function findDuplicateGroupName(
  companyId: number,
  candidateName: string,
  excludeGroupId?: number,
): Promise<{ id: number } | null> {
  const key = canonicalKey(candidateName);
  if (!key) return null;

  const where: Prisma.GroupWhereInput = {
    companyId,
    name: { contains: normalizeGroupName(candidateName), mode: "insensitive" },
  };
  if (excludeGroupId !== undefined) {
    where.NOT = { id: excludeGroupId };
  }

  const candidates = await db.group.findMany({
    where,
    select: { id: true, name: true },
  });

  const hit = candidates.find((g) => canonicalKey(g.name) === key);
  return hit ? { id: hit.id } : null;
}
