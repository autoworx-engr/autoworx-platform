"use server";

import { requireCompanyAndUserId } from "@/lib/crm-actions-helpers";
import { db } from "@/lib/db";
import { ServiceStage, TicketPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateService() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/service-pipeline");
}

export async function createServiceTicket(formData: FormData) {
  const { companyId, userId } = await requireCompanyAndUserId();
  const title = String(formData.get("title") ?? "").trim();
  const accountId = Number(formData.get("accountId"));
  if (!title || !Number.isFinite(accountId) || accountId <= 0) return;

  const contactRaw = String(formData.get("contactId") ?? "").trim();
  const contactId = contactRaw ? Number(contactRaw) : null;

  const dealRaw = String(formData.get("dealId") ?? "").trim();
  const dealId = dealRaw ? Number(dealRaw) : null;

  const priorityRaw = String(formData.get("priority") ?? "MEDIUM");
  const priority = Object.values(TicketPriority).includes(priorityRaw as TicketPriority)
    ? (priorityRaw as TicketPriority)
    : TicketPriority.MEDIUM;

  const description = String(formData.get("description") ?? "").trim() || null;

  await db.serviceTicket.create({
    data: {
      companyId,
      accountId,
      ownerId: userId,
      title,
      description,
      priority,
      contactId: contactId && Number.isFinite(contactId) ? contactId : null,
      dealId: dealId && Number.isFinite(dealId) ? dealId : null,
      stage: ServiceStage.ONBOARDING,
    },
  });

  revalidateService();
}

export async function moveTicketStage(
  ticketId: number,
  stage: ServiceStage,
): Promise<{ ok: boolean; error?: string }> {
  const { companyId } = await requireCompanyAndUserId();
  if (!Object.values(ServiceStage).includes(stage)) {
    return { ok: false, error: "Invalid stage" };
  }
  const result = await db.serviceTicket.updateMany({
    where: { id: ticketId, companyId, deletedAt: null },
    data: { stage },
  });
  if (result.count === 0) return { ok: false, error: "Ticket not found" };
  revalidateService();
  revalidatePath(`/dashboard/service-pipeline`);
  return { ok: true };
}

export async function updateTicket(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const priorityRaw = String(formData.get("priority") ?? "MEDIUM");
  const priority = Object.values(TicketPriority).includes(priorityRaw as TicketPriority)
    ? (priorityRaw as TicketPriority)
    : TicketPriority.MEDIUM;

  const stageRaw = String(formData.get("stage") ?? "");
  const stage = Object.values(ServiceStage).includes(stageRaw as ServiceStage)
    ? (stageRaw as ServiceStage)
    : undefined;

  const ownerRaw = String(formData.get("ownerId") ?? "").trim();
  const ownerId = ownerRaw && Number.isFinite(Number(ownerRaw)) ? Number(ownerRaw) : undefined;

  await db.serviceTicket.updateMany({
    where: { id, companyId, deletedAt: null },
    data: {
      title,
      priority,
      description: String(formData.get("description") ?? "").trim() || null,
      ...(stage ? { stage } : {}),
      ...(ownerId ? { ownerId } : {}),
    },
  });

  revalidateService();
  revalidatePath(`/dashboard/service-pipeline/${id}`);
}

export async function archiveTicket(formData: FormData) {
  const { companyId } = await requireCompanyAndUserId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.serviceTicket.updateMany({
    where: { id, companyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  revalidateService();
  redirect("/dashboard/service-pipeline");
}
