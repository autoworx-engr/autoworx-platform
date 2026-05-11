"use server";

import { getEssentials } from "@/lib/auth-utils";
import {
  createLeadRecord,
  type CreateLeadResult,
} from "@/lib/leads/createLeadRecord";
import { ServerAction } from "@/types/action";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  countryCode: z.string().optional(),
  serviceId: z.string().optional(),
  opportunity_source: z.string().min(1, "Opportunity source is required"),
  source: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

function parseOpportunitySource(opportunity: string) {
  const [sourcePart = "", afterParen = ""] = opportunity.split(")");
  const parsedSource = sourcePart.replace("(", "").trim();
  const [parsedVehicleInfo = "", parsedServices = ""] = afterParen
    .split("|")
    .map((s) => s.trim());
  return { parsedSource, parsedVehicleInfo, parsedServices };
}

export async function createLead(
  input: CreateLeadInput,
): Promise<ServerAction & { data?: CreateLeadResult }> {
  try {
    const { companyId } = await getEssentials();

    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        type: "error",
        message: firstIssue?.message ?? "Invalid input",
        field: firstIssue?.path[0] as string | undefined,
      };
    }

    const { name, email, phone, countryCode, serviceId, opportunity_source } =
      parsed.data;

    const { parsedSource, parsedVehicleInfo, parsedServices } =
      parseOpportunitySource(opportunity_source);

    if (!name || !parsedVehicleInfo || !parsedServices || !parsedSource) {
      return { type: "error", message: "Invalid input" };
    }

    const result = await createLeadRecord(
      {
        clientName: name,
        clientEmail: email || undefined,
        clientPhone: phone,
        countryCode,
        vehicleInfo: parsedVehicleInfo,
        services: parsedServices,
        source: parsedSource,
        serviceId: serviceId ? +serviceId : null,
      },
      companyId,
      { isCRM: false, doTriggerAutomation: true, sendOpeningSms: true },
    );

    return {
      type: "success",
      message: "Lead created successfully",
      data: result,
    };
  } catch (err: any) {
    console.error("[createLead] error:", err?.message ?? err);
    return { type: "error", message: err?.message ?? "Failed to create lead" };
  }
}
