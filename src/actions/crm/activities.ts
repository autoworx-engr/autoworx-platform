"use server";

import { requireCompanyAndUserId, requireCompanyId, str } from "@/lib/crm-actions-helpers";
import { KANBAN_STAGE_ORDER } from "@/lib/crm-constants";
import { db } from "@/lib/db";
import { ActivityType, DealStage } from "@prisma/client";
import { revalidatePath } from "next/cache";

function revalidateAllActivity() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/activities");
  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/pipeline");
}

export async function createActivity(formData: FormData) {
  const { companyId, userId } = await requireCompanyAndUserId();
  const subject = String(formData.get("subject") ?? "").trim();
  const type = String(formData.get("type") ?? "NOTE") as ActivityType;
  if (!subject) return;
  if (!Object.values(ActivityType).includes(type)) return;

  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const dueAt = dueRaw ? new Date(dueRaw) : null;

  const dealId = (() => {
    const raw = String(formData.get("dealId") ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const contactId = (() => {
    const raw = String(formData.get("contactId") ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const accountId = (() => {
    const raw = String(formData.get("accountId") ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  await db.activity.create({
    data: {
      companyId,
      userId,
      type,
      subject,
      body: str(formData, "body"),
      dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
      dealId,
      contactId,
      accountId,
    },
  });
  revalidateAllActivity();
}

/**
 * Mark an activity as completed.
 *
 * Optional form field `advanceDeal=1`: if the activity is linked to a deal
 * and the deal is not yet WON/LOST, advance it one stage in the pipeline.
 * Activity types that trigger advancement: CALL, MEETING, EMAIL.
 */
export async function completeActivity(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  const activity = await db.activity.findFirst({
    where: { id, companyId },
    include: { deal: true },
  });
  if (!activity) return;

  await db.activity.updateMany({
    where: { id, companyId },
    data: { completedAt: new Date() },
  });

  // Auto-advance deal stage when requested and conditions are met
  const advanceDeal = String(formData.get("advanceDeal") ?? "").trim() === "1";
  const ADVANCING_TYPES: ActivityType[] = [
    ActivityType.CALL,
    ActivityType.MEETING,
    ActivityType.EMAIL,
  ];

  if (
    advanceDeal &&
    activity.dealId &&
    activity.deal &&
    ADVANCING_TYPES.includes(activity.type) &&
    activity.deal.stage !== DealStage.WON &&
    activity.deal.stage !== DealStage.LOST
  ) {
    const currentIdx = KANBAN_STAGE_ORDER.indexOf(activity.deal.stage);
    // KANBAN_STAGE_ORDER ends with WON and LOST; advance only within open stages
    const openStages = KANBAN_STAGE_ORDER.filter(
      (s) => s !== DealStage.WON && s !== DealStage.LOST,
    );
    const openIdx = openStages.indexOf(activity.deal.stage);
    const nextStage = openIdx >= 0 && openIdx < openStages.length - 1
      ? openStages[openIdx + 1]
      : null;

    if (nextStage) {
      await db.deal.update({
        where: { id: activity.dealId },
        data: { stage: nextStage },
      });
      revalidatePath(`/dashboard/deals/${activity.dealId}`);
      revalidatePath("/dashboard/pipeline");
    }
  }

  revalidateAllActivity();
}

export async function deleteActivity(formData: FormData) {
  const companyId = await requireCompanyId();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.activity.deleteMany({
    where: { id, companyId },
  });
  revalidateAllActivity();
}
