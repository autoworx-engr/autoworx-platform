import { db } from "@/lib/db";
import { SalaryType } from "@prisma/client";

export async function getActiveSalaryType(
  userId: number,
  companyId: number,
): Promise<SalaryType | null> {
  const active = await db.salaryHistory.findFirst({
    where: { userId, companyId, isActive: true },
    orderBy: { startDate: "desc" },
    select: { salaryType: true },
  });

  return active?.salaryType ?? null;
}

export async function isHourlyEmployee(userId: number, companyId: number) {
  return (await getActiveSalaryType(userId, companyId)) === "HOURLY";
}
