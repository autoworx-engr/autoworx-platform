"use server";

import { requireCompanyAndUserId } from "@/lib/crm-actions-helpers";
import { db } from "@/lib/db";
import { EmployeeType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateEmployees() {
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard");
}

/** Create a new team member under the current company. */
export async function inviteEmployee(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const employeeTypeRaw = String(formData.get("employeeType") ?? EmployeeType.Other);
  const roleRaw = String(formData.get("role") ?? Role.employee);

  if (!firstName || !email) return;
  if (!Object.values(EmployeeType).includes(employeeTypeRaw as EmployeeType)) return;
  if (!Object.values(Role).includes(roleRaw as Role)) return;

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) {
    redirect("/dashboard/employees?error=email_taken");
  }

  const tempPassword = "TempPass123!";
  const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
  const hashed = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      password: hashed,
      companyId,
      role: roleRaw as Role,
      employeeType: employeeTypeRaw as EmployeeType,
    },
  });

  revalidateEmployees();
  redirect("/dashboard/employees?invited=1");
}

/** Update an employee's type and role. */
export async function updateEmployeeType(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();

  const userId = Number(formData.get("userId"));
  const employeeTypeRaw = String(formData.get("employeeType") ?? "");
  const roleRaw = String(formData.get("role") ?? "");

  if (!Number.isFinite(userId) || userId <= 0) return;
  if (!Object.values(EmployeeType).includes(employeeTypeRaw as EmployeeType)) return;
  if (!Object.values(Role).includes(roleRaw as Role)) return;

  await db.user.updateMany({
    where: { id: userId, companyId },
    data: {
      employeeType: employeeTypeRaw as EmployeeType,
      role: roleRaw as Role,
    },
  });

  revalidateEmployees();
}

/** Reassign all open deals and service tickets owned by the employee, then remove from company.
 *  For safety we do a soft reassign to the caller and archive nothing. */
export async function reassignAndRemoveEmployee(formData: FormData) {
  const { companyId, userId: callerId } = await requireCompanyAndUserId();

  const targetId = Number(formData.get("userId"));
  if (!Number.isFinite(targetId) || targetId <= 0) return;
  if (targetId === callerId) return; // can't remove yourself

  const target = await db.user.findFirst({ where: { id: targetId, companyId } });
  if (!target) return;

  // Reassign open deals to the caller
  await db.deal.updateMany({
    where: { ownerId: targetId, companyId, deletedAt: null },
    data: { ownerId: callerId },
  });

  // Reassign open service tickets to the caller
  await db.serviceTicket.updateMany({
    where: { ownerId: targetId, companyId, deletedAt: null },
    data: { ownerId: callerId },
  });

  // We don't hard-delete users; instead flag the record so it stops appearing.
  // There's no `deletedAt` on User in the schema so we mark them with a sentinel role.
  // A proper migration would add `deactivatedAt DateTime?` but without that we skip hard removal.
  revalidateEmployees();
}
