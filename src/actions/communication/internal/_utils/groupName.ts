import { db } from "@/lib/db";
import { canonicalKey, normalizeGroupName } from "@/lib/utils/groupName";
import { Prisma } from "@prisma/client";

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
