"use server";

import { intOrNull, requireCompanyId, str } from "@/lib/crm-actions-helpers";
import { activeContactWhere } from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { ContactLifecycle } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateContacts() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/pipeline");
}

export async function createContact(formData: FormData) {
  const companyId = await requireCompanyId();
  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!firstName) return;
  const accountId = intOrNull(formData, "accountId");
  const lifecycleRaw = String(formData.get("lifecycle") ?? "LEAD");
  const lifecycle = Object.values(ContactLifecycle).includes(
    lifecycleRaw as ContactLifecycle,
  )
    ? (lifecycleRaw as ContactLifecycle)
    : ContactLifecycle.LEAD;

  await db.contact.create({
    data: {
      companyId,
      accountId,
      firstName,
      lastName: str(formData, "lastName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      title: str(formData, "title"),
      lifecycle,
      notes: str(formData, "notes"),
    },
  });
  revalidateContacts();
}

export async function updateContact(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!firstName) return;
  const lifecycleRaw = String(formData.get("lifecycle") ?? "LEAD");
  const lifecycle = Object.values(ContactLifecycle).includes(
    lifecycleRaw as ContactLifecycle,
  )
    ? (lifecycleRaw as ContactLifecycle)
    : ContactLifecycle.LEAD;

  await db.contact.updateMany({
    where: { id, companyId, ...activeContactWhere },
    data: {
      firstName,
      lastName: str(formData, "lastName"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      title: str(formData, "title"),
      accountId: intOrNull(formData, "accountId"),
      lifecycle,
      notes: str(formData, "notes"),
    },
  });
  revalidateContacts();
  revalidatePath(`/dashboard/contacts/${id}`);
}

export async function archiveContact(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.contact.updateMany({
    where: { id, companyId, ...activeContactWhere },
    data: { deletedAt: new Date() },
  });
  revalidateContacts();
  redirect("/dashboard/contacts");
}
