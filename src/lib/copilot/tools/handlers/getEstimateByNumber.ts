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
    include: {
      client: { select: { firstName: true, lastName: true } },
      vehicle: { select: { year: true, make: true, model: true } },
      column: { select: { title: true } },
      invoiceItems: {
        include: {
          labor: {
            select: { name: true, hours: true, charge: true, discount: true },
          },
          materials: {
            select: {
              name: true,
              quantity: true,
              sell: true,
              cost: true,
              discount: true,
            },
          },
        },
      },
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

  const items = invoice.invoiceItems.map((item) => ({
    id: item.id,
    serviceDesc: item.serviceDesc ?? null,
    labor: item.labor
      ? {
          name: item.labor.name,
          hours: Number(item.labor.hours),
          charge: Number(item.labor.charge),
          discount: Number(item.labor.discount ?? 0),
        }
      : null,
    materials: item.materials.map((mat) => ({
      name: mat.name,
      quantity: Number(mat.quantity ?? 0),
      sell: Number(mat.sell ?? 0),
      cost: Number(mat.cost ?? 0),
      discount: Number(mat.discount ?? 0),
    })),
  }));

  return {
    ok: true,
    data: {
      id: invoice.id,
      type: invoice.type,
      status: invoice.column?.title ?? null,
      subtotal: Number(invoice.subtotal ?? 0),
      discount: Number(invoice.discount ?? 0),
      grandTotal: Number(invoice.grandTotal ?? 0),
      clientName,
      vehicleInfo,
      createdAt: invoice.createdAt.toISOString(),
      publicLink: `${appUrl}/public-invoice/${invoice.id}`,
      editLink: `/dashboard/estimate/edit/${invoice.id}`,
      items,
    },
  };
}

registerTool({
  name: "get_estimate_by_number",
  description:
    "Fetch a specific estimate or invoice by its ID, including all line items (services, labor, and materials). Use when the user references a specific estimate by ID or asks what's on an estimate.",
  permission: "estimate.read",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      invoiceId: {
        type: "string",
        description: "The estimate or invoice ID.",
      },
    },
    required: ["invoiceId"],
  },
  execute,
});
