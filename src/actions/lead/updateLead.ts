"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getEssentials } from "@/lib/auth-utils";
import { ServerAction } from "@/types/action";

const UpdateLeadSchema = z.object({
  leadId: z.number().int().positive(),
  columnId: z.number().int().positive().nullable().optional(),
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  vehicleInfo: z.string().min(1).optional(),
  services: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  comments: z.string().optional(),
  assignedSalesUserId: z.number().int().positive().nullable().optional(),
});

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

export async function updateLead(
  input: UpdateLeadInput,
  options?: { forceCompanyId?: number; forceUserId?: number },
): Promise<ServerAction> {
  try {
    const parsed = UpdateLeadSchema.parse(input);

    let companyId: number;
    if (options?.forceCompanyId) {
      companyId = options.forceCompanyId;
    } else {
      const essentials = await getEssentials();
      companyId = essentials.companyId;
    }

    const existing = await db.lead.findFirst({
      where: { id: parsed.leadId, companyId },
      select: { id: true },
    });
    if (!existing) {
      return { type: "error", message: "Lead not found" };
    }

    const { leadId, ...updateData } = parsed;
    await db.lead.update({
      where: { id: leadId, companyId },
      data: updateData,
    });

    return { type: "success", message: "Lead updated", data: { leadId } };
  } catch (error) {
    console.error("[updateLead] error:", error);
    return {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to update lead",
    };
  }
}
