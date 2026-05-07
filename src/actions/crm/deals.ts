"use server";

import { intOrNull, requireCompanyAndUserId, requireCompanyId, str } from "@/lib/crm-actions-helpers";
import { activeDealWhere } from "@/lib/crm-scope";
import { db } from "@/lib/db";
import { DealStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function closedAtForStage(stage: DealStage): Date | null {
  if (stage === DealStage.WON || stage === DealStage.LOST) return new Date();
  return null;
}

function revalidateDeals() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/invoices");
}

export async function createDeal(formData: FormData) {
  const { companyId, userId } = await requireCompanyAndUserId();
  const title = String(formData.get("title") ?? "").trim();
  const accountId = Number(formData.get("accountId"));
  if (!title || !Number.isFinite(accountId) || accountId <= 0) return;

  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = valueRaw ? Number(valueRaw) : null;
  const stage = String(formData.get("stage") ?? "LEAD") as DealStage;
  const probRaw = String(formData.get("probability") ?? "").trim();
  const probability = probRaw ? Number(probRaw) : 0;

  const contactRaw = String(formData.get("contactId") ?? "").trim();
  const contactId = contactRaw ? Number(contactRaw) : null;
  if (contactId != null && (!Number.isFinite(contactId) || contactId <= 0)) {
    return;
  }

  // Allow assigning to a specific employee; fall back to the current user
  const ownerRaw = String(formData.get("ownerId") ?? "").trim();
  const ownerIdFromForm = ownerRaw ? Number(ownerRaw) : null;
  const resolvedOwnerId =
    ownerIdFromForm && Number.isFinite(ownerIdFromForm) && ownerIdFromForm > 0
      ? ownerIdFromForm
      : userId;

  const closeRaw = String(formData.get("expectedCloseDate") ?? "").trim();
  const expectedCloseDate = closeRaw ? new Date(closeRaw) : null;

  await db.deal.create({
    data: {
      companyId,
      accountId,
      ownerId: resolvedOwnerId,
      title,
      description: str(formData, "description"),
      source: str(formData, "source"),
      value: value != null && Number.isFinite(value) ? value : null,
      stage: Object.values(DealStage).includes(stage) ? stage : DealStage.LEAD,
      probability: Number.isFinite(probability) ? Math.min(100, Math.max(0, probability)) : 0,
      contactId: contactId && Number.isFinite(contactId) ? contactId : null,
      expectedCloseDate:
        expectedCloseDate && !Number.isNaN(expectedCloseDate.getTime())
          ? expectedCloseDate
          : null,
      closedAt: closedAtForStage(
        Object.values(DealStage).includes(stage) ? stage : DealStage.LEAD,
      ),
    },
  });
  revalidateDeals();
}

export async function updateDeal(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(accountId) || accountId <= 0) return;

  const stage = String(formData.get("stage") ?? "LEAD") as DealStage;
  if (!Object.values(DealStage).includes(stage)) return;

  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = valueRaw ? Number(valueRaw) : null;
  const probRaw = String(formData.get("probability") ?? "").trim();
  const probability = probRaw ? Number(probRaw) : 0;

  const contactId = intOrNull(formData, "contactId");
  const ownerRaw = String(formData.get("ownerId") ?? "").trim();
  const ownerId = ownerRaw ? Number(ownerRaw) : null;

  const closeRaw = String(formData.get("expectedCloseDate") ?? "").trim();
  const expectedCloseDate = closeRaw ? new Date(closeRaw) : null;

  const lostReason =
    stage === DealStage.LOST ? str(formData, "lostReason") : null;

  await db.deal.updateMany({
    where: { id, companyId, ...activeDealWhere },
    data: {
      title,
      description: str(formData, "description"),
      source: str(formData, "source"),
      accountId,
      contactId,
      ...(ownerId && Number.isFinite(ownerId) ? { ownerId } : {}),
      value: value != null && Number.isFinite(value) ? value : null,
      stage,
      probability: Number.isFinite(probability) ? Math.min(100, Math.max(0, probability)) : 0,
      lostReason,
      expectedCloseDate:
        expectedCloseDate && !Number.isNaN(expectedCloseDate.getTime())
          ? expectedCloseDate
          : null,
      closedAt: closedAtForStage(stage),
    },
  });
  revalidateDeals();
  revalidatePath(`/dashboard/deals/${id}`);
}

export async function updateDealStage(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  const stage = String(formData.get("stage") ?? "") as DealStage;
  if (!Number.isFinite(id) || !Object.values(DealStage).includes(stage)) return;
  await db.deal.updateMany({
    where: { id, companyId, ...activeDealWhere },
    data: {
      stage,
      closedAt: closedAtForStage(stage),
      ...(stage !== DealStage.LOST ? { lostReason: null } : {}),
    },
  });
  revalidateDeals();
  revalidatePath(`/dashboard/deals/${id}`);
}

/** Client-safe stage move (e.g. pipeline drag-and-drop). Returns a result object instead of redirecting. */
export async function moveDealStage(
  dealId: number,
  stage: DealStage,
): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireCompanyAndUserId();
  if (companyId == null) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!Number.isFinite(dealId) || dealId <= 0) {
    return { ok: false, error: "Invalid deal" };
  }
  if (!Object.values(DealStage).includes(stage)) {
    return { ok: false, error: "Invalid stage" };
  }
  const result = await db.deal.updateMany({
    where: { id: dealId, companyId, ...activeDealWhere },
    data: {
      stage,
      closedAt: closedAtForStage(stage),
      ...(stage !== DealStage.LOST ? { lostReason: null } : {}),
    },
  });
  if (result.count === 0) {
    return { ok: false, error: "Deal not found or archived" };
  }
  revalidateDeals();
  revalidatePath(`/dashboard/deals/${dealId}`);
  return { ok: true };
}

export async function archiveDeal(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.deal.updateMany({
    where: { id, companyId, ...activeDealWhere },
    data: { deletedAt: new Date() },
  });
  revalidateDeals();
  redirect("/dashboard/deals");
}
