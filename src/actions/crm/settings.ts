"use server";

import { requireCompanyAndUserId } from "@/lib/crm-actions-helpers";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateSettings() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const { companyId, userId } = await requireCompanyAndUserId();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName  = String(formData.get("lastName")  ?? "").trim() || null;
  const phone     = String(formData.get("phone")     ?? "").trim() || null;

  if (!firstName) return;

  await db.user.updateMany({
    where: { id: userId, companyId },
    data: { firstName, lastName, phone },
  });

  revalidateSettings();
}

export async function updatePassword(formData: FormData) {
  const { companyId, userId } = await requireCompanyAndUserId();

  const current  = String(formData.get("currentPassword")  ?? "").trim();
  const next     = String(formData.get("newPassword")       ?? "").trim();
  const confirm  = String(formData.get("confirmPassword")   ?? "").trim();

  if (!current || !next || next.length < 8) {
    redirect("/dashboard/settings?error=password_weak");
  }
  if (next !== confirm) {
    redirect("/dashboard/settings?error=password_mismatch");
  }

  const user = await db.user.findFirst({ where: { id: userId, companyId } });
  if (!user) return;

  const valid = await bcrypt.compare(current, user.password);
  if (!valid) {
    redirect("/dashboard/settings?error=password_wrong");
  }

  const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
  const hashed = await bcrypt.hash(next, SALT_ROUNDS);

  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  revalidateSettings();
  redirect("/dashboard/settings?success=password");
}

export async function updateWorkspaceSettings(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();

  const name     = String(formData.get("name")     ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!name) return;

  await db.company.update({
    where: { id: companyId },
    data: {
      name,
      ...(timezone ? { timezone } : {}),
    },
  });

  revalidateSettings();
}
