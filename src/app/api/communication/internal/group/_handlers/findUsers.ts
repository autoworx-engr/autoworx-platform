import { AppError } from "@/error-boundary/error";
import { db } from "@/lib/db";

/**
 * Verifies every supplied user id belongs to `companyId`. Throws on missing
 * id, on a user that isn't in the company, or on any blank id.
 */
export async function findUsers(
  users: { id: number; action?: string }[],
  companyId: number,
) {
  const ids = users.map((u) => {
    if (!u.id) throw new AppError(400, "User ID is required");
    return u.id;
  });

  const found = await db.user.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true },
  });

  if (found.length !== ids.length) {
    const foundSet = new Set(found.map((u) => u.id));
    const missing = ids.find((id) => !foundSet.has(id));
    throw new AppError(404, `User with ID ${missing} not found in company`);
  }

  return found;
}
