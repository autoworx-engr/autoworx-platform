"use server";

import { db } from "@/lib/db";
import { getEssentials } from "@/lib/auth-utils";
import {
  normalizeActionResult,
  normalizeError,
} from "@/lib/copilot/normalizeActionResult";
import { writeAuditLog } from "@/lib/copilot/audit";
import type { ServerAction } from "@/types/action";
import { z } from "zod";
import { sendInvoiceEmail } from "./sendInvoiceEmail";
import { sendInvoiceSms } from "./sendInvoiceSms";

const SendEstimateSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
  channel: z.enum(["email", "sms", "auto"]).default("auto"),
});

export type SendEstimateInput = z.infer<typeof SendEstimateSchema>;

export async function sendEstimate(
  input: SendEstimateInput,
): Promise<ServerAction> {
  const start = Date.now();
  let essentials: { companyId: number; userId: number } | null = null;

  try {
    essentials = await getEssentials();

    const parsed = SendEstimateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        type: "error",
        message: parsed.error.errors[0]?.message ?? "Invalid input",
        field: parsed.error.errors[0]?.path[0] as string | undefined,
      };
    }

    const { invoiceId, channel } = parsed.data;

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        companyId: true,
        client: { select: { email: true, mobile: true } },
      },
    });

    if (!invoice || invoice.companyId !== essentials.companyId) {
      return { type: "error", message: "Invoice not found." };
    }

    const resolvedChannel = resolveChannel(channel, invoice.client);
    if (!resolvedChannel) {
      return {
        type: "error",
        message: "Client has no email or phone on file. Cannot send invoice.",
      };
    }

    let raw: unknown;
    if (resolvedChannel === "email") {
      raw = await sendInvoiceEmail({ invoiceId });
    } else {
      raw = await sendInvoiceSms({ invoiceId });
    }

    const result = normalizeActionResult(raw);

    await writeAuditLog({
      actor: "copilot",
      action: "estimate.send",
      userId: essentials.userId,
      companyId: essentials.companyId,
      resourceType: "Invoice",
      resourceId: invoiceId,
      input: { invoiceId, channel, resolvedChannel },
      output: result,
      success: result.ok,
      errorMessage: result.ok ? undefined : result.error,
      latencyMs: Date.now() - start,
    });

    if (result.ok) {
      return {
        type: "success",
        message: `Invoice sent via ${resolvedChannel}.`,
      };
    }

    return { type: "error", message: result.error };
  } catch (err) {
    const normalized = normalizeError(err);

    if (essentials) {
      await writeAuditLog({
        actor: "copilot",
        action: "estimate.send",
        userId: essentials.userId,
        companyId: essentials.companyId,
        resourceType: "Invoice",
        resourceId: input?.invoiceId,
        input,
        success: false,
        errorMessage: normalized.error,
        latencyMs: Date.now() - start,
      });
    }

    return { type: "error", message: normalized.error };
  }
}

function resolveChannel(
  channel: "email" | "sms" | "auto",
  client: { email?: string | null; mobile?: string | null } | null,
): "email" | "sms" | null {
  if (channel === "email") return "email";
  if (channel === "sms") return "sms";

  if (client?.email) return "email";
  if (client?.mobile) return "sms";
  return null;
}
