import { z } from "zod";
import { db } from "@/lib/db";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  invoiceId: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { invoiceId } = input as Input;

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, companyId: ctx.companyId },
    select: {
      id: true,
      type: true,
      grandTotal: true,
      createdAt: true,
      client: { select: { firstName: true, lastName: true } },
      vehicle: { select: { year: true, make: true, model: true } },
      column: { select: { title: true } },
    },
  });

  if (!invoice) {
    return {
      ok: false,
      error: `Invoice ${invoiceId} not found in your company.`,
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const clientName = invoice.client
    ? `${invoice.client.firstName} ${invoice.client.lastName ?? ""}`.trim()
    : null;
  const v = invoice.vehicle;
  const vehicleInfo = v
    ? [v.year, v.make, v.model].filter(Boolean).join(" ") || null
    : null;

  return {
    ok: true,
    data: {
      id: invoice.id,
      type: invoice.type,
      status: invoice.column?.title ?? null,
      grandTotal: Number(invoice.grandTotal ?? 0),
      clientName,
      vehicleInfo,
      createdAt: invoice.createdAt.toISOString(),
      publicLink: `${appUrl}/public-invoice/${invoice.id}`,
      editLink: `/dashboard/estimate/edit/${invoice.id}`,
    },
  };
}

registerTool({
  name: "get_estimate_by_number",
  description:
    "Fetch a specific estimate or invoice by its ID. Use when the user references a specific estimate by number or ID.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      invoiceId: {
        type: "string",
        description: "The estimate or invoice ID (e.g. a cuid string)",
      },
    },
    required: ["invoiceId"],
  },
  execute,
});
