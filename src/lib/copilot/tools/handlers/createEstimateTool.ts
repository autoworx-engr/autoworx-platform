import { z } from "zod";
import { db } from "@/lib/db";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  clientId: z.number().int().positive(),
  vehicleId: z.number().int().positive().nullable().optional(),
  services: z
    .array(
      z.object({
        serviceName: z.string().min(1),
        laborHours: z.number().positive(),
        laborRate: z.number().nonnegative(),
        laborName: z.string().optional(),
      }),
    )
    .min(1),
});

type Input = z.infer<typeof inputSchema>;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { clientId, vehicleId, services } = input as Input;

  // 1. Look up company tax/serviceFee rates — never from AI input
  const company = await db.company.findUnique({
    where: { id: ctx.companyId },
    select: { tax: true, serviceFee: true },
  });
  const taxRate = Number(company?.tax ?? 0);
  const serviceFeeRate = Number(company?.serviceFee ?? 0);

  // 2. Compute totals server-side from line items only.
  //    taxAdd = 0: tax applies to materials only; no materials in Phase 3c.2.
  //    suppliesFeeAdd applies to the full subtotal (materials + labor).
  const subtotal = round2(
    services.reduce((sum, s) => sum + s.laborHours * s.laborRate, 0),
  );
  const suppliesFeeAdd = round2(subtotal * (serviceFeeRate / 100));
  const grandTotal = round2(subtotal + suppliesFeeAdd);
  const due = grandTotal;

  // 3. Build items[] — each service maps to one item with inline labor creation.
  //    serviceDesc stores the free-text service name; no pre-existing serviceId needed.
  const items = services.map((s) => ({
    serviceDesc: s.serviceName,
    labor: {
      name: s.laborName ?? s.serviceName,
      hours: s.laborHours,
      charge: s.laborRate,
      discount: 0,
    },
    materials: [],
  }));

  // 4. Call the estimate creation route. tax/serviceFee are stored as RATES
  //    (percentages), not dollar amounts — the route stores them as-is.
  //    columnId is omitted: the route auto-resolves the "Pending" column.
  const result = await callInternalApi({
    method: "POST",
    path: `/api/estimate/${ctx.companyId}`,
    userId: ctx.userId,
    body: {
      type: "Estimate",
      clientId,
      vehicleId: vehicleId ?? undefined,
      subtotal,
      discount: 0,
      tax: taxRate,
      serviceFee: serviceFeeRate,
      vehicleExtraCost: 0,
      grandTotal,
      deposit: 0,
      due,
      items,
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const payload = result.data as { data?: { id?: string } };
  const estimateId = payload?.data?.id;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const publicLink = estimateId
    ? `${appUrl}/public-invoice/${estimateId}`
    : null;
  const editLink = estimateId ? `/dashboard/estimate/edit/${estimateId}` : null;

  return {
    ok: true,
    data: {
      estimateId,
      grandTotal,
      publicLink,
      editLink,
      message: `Estimate created with ${services.length} service${services.length > 1 ? "s" : ""}. Total: $${grandTotal.toFixed(2)}.`,
    },
  };
}

registerTool({
  name: "create_estimate",
  description:
    "Create a draft ESTIMATE (not an invoice) for a client with one or more services and labor. Resolve the client with get_client_by_name first. Totals are computed server-side from the line items — never pass a dollar total. Returns estimateId, grandTotal, publicLink (client-facing), and editLink.",
  permission: "estimate.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "number",
        description:
          "The numeric client ID to create the estimate for. Resolve with get_client_by_name first.",
      },
      vehicleId: {
        type: "number",
        description:
          "Optional vehicle ID to attach to the estimate. Use get_vehicle_by_client if you need to look it up.",
      },
      services: {
        type: "array",
        description:
          "One or more services. Each becomes a line item with an inline labor record.",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description:
                "Free-text service description (e.g. 'Oil Change', 'Ceramic Coating').",
            },
            laborHours: {
              type: "number",
              description: "Number of labor hours for this service.",
            },
            laborRate: {
              type: "number",
              description: "Hourly labor charge in dollars for this service.",
            },
            laborName: {
              type: "string",
              description:
                "Optional labor line name if different from serviceName.",
            },
          },
          required: ["serviceName", "laborHours", "laborRate"],
        },
      },
    },
    required: ["clientId", "services"],
  },
  execute,
});
