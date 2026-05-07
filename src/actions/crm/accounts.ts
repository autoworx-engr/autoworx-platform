"use server";

import { activeAccountWhere } from "@/lib/crm-scope";
import {
  optionalIntGteZero,
  requireCompanyId,
  str,
} from "@/lib/crm-actions-helpers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateAccounts() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/pipeline");
}

export async function createAccount(formData: FormData) {
  const companyId = await requireCompanyId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.crmAccount.create({
    data: {
      companyId,
      name,
      website: str(formData, "website"),
      industry: str(formData, "industry"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      city: str(formData, "city"),
      state: str(formData, "state"),
      country: str(formData, "country"),
      postalCode: str(formData, "postalCode"),
      employeeCount: optionalIntGteZero(formData, "employeeCount"),
      annualRevenue: (() => {
        const raw = String(formData.get("annualRevenue") ?? "").trim();
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      notes: str(formData, "notes"),
    },
  });
  revalidateAccounts();
}

export async function updateAccount(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.crmAccount.updateMany({
    where: { id, companyId, ...activeAccountWhere },
    data: {
      name,
      website: str(formData, "website"),
      industry: str(formData, "industry"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      city: str(formData, "city"),
      state: str(formData, "state"),
      country: str(formData, "country"),
      postalCode: str(formData, "postalCode"),
      employeeCount: optionalIntGteZero(formData, "employeeCount"),
      annualRevenue: (() => {
        const raw = String(formData.get("annualRevenue") ?? "").trim();
        if (!raw) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })(),
      notes: str(formData, "notes"),
    },
  });
  revalidateAccounts();
  revalidatePath(`/dashboard/accounts/${id}`);
}

export async function archiveAccount(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.crmAccount.updateMany({
    where: { id, companyId, ...activeAccountWhere },
    data: { deletedAt: new Date() },
  });
  revalidateAccounts();
  redirect("/dashboard/accounts");
}
