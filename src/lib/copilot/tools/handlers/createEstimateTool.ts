import { z } from "zod";
import { db } from "@/lib/db";
import { callInternalApi } from "@/lib/copilot/internalApiClient";
import { round2 } from "@/lib/copilot/estimateMath";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const materialSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  sellPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  productId: z.number().int().positive().optional(),
});

const inputSchema = z.object({
  clientId: z.number().int().positive(),
  vehicleId: z.number().int().positive().nullable().optional(),
  applyShopSupplies: z.boolean().optional(),
  applyTax: z.boolean().optional(),
  services: z
    .array(
      z.object({
        serviceName: z.string().min(1),
        laborHours: z.number().positive(),
        laborRate: z.number().nonnegative(),
        laborName: z.string().optional(),
        materials: z.array(materialSchema).optional(),
      }),
    )
    .min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { clientId, vehicleId, services, applyShopSupplies, applyTax } =
    input as Input;

  // 0. Validate IDs exist before any write — catches AI-hallucinated IDs.
  const client = await db.client.findFirst({
    where: { id: clientId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!client) {
    return {
      ok: false,
      error: `Client ID ${clientId} was not found for this company. Call get_client_by_name again and use the exact id it returns — do not guess or recall an ID from memory.`,
    };
  }

  if (vehicleId != null) {
    const vehicle = await db.vehicle.findFirst({
      where: { id: vehicleId, clientId, companyId: ctx.companyId },
      select: { id: true },
    });
    if (!vehicle) {
      return {
        ok: false,
        error: `Vehicle ID ${vehicleId} was not found for client ${clientId}. Call get_vehicle_by_client to get the correct vehicle id, or omit the vehicle.`,
      };
    }
  }

  // 0b. Pre-validate materials — route throws on quantity ≤ 0 or missing name.
  for (const svc of services) {
    for (const mat of svc.materials ?? []) {
      if (!mat.name.trim()) {
        return { ok: false, error: "Each material must have a name." };
      }
      if (mat.quantity <= 0) {
        return {
          ok: false,
          error: `Material "${mat.name}" has quantity ≤ 0. Quantity must be greater than zero.`,
        };
      }
    }
  }

  // 1. Look up company tax/serviceFee rates — never from AI input.
  const company = await db.company.findUnique({
    where: { id: ctx.companyId },
    select: { tax: true, serviceFee: true },
  });
  const taxRate = Number(company?.tax ?? 0);
  const serviceFeeRate = Number(company?.serviceFee ?? 0);
  const taxRateToUse = applyTax === false ? 0 : taxRate;
  const serviceFeeRateToUse = applyShopSupplies === false ? 0 : serviceFeeRate;

  // 2. Compute totals server-side.
  //    taxAdd applies to materials only (labor is not taxed).
  //    suppliesFeeAdd applies to the full subtotal (labor + materials).
  //    material.discount is a dollar amount; it flows into the invoice-level discount.
  const laborSubtotal = services.reduce(
    (s, sv) => s + sv.laborHours * sv.laborRate,
    0,
  );
  const materialSubtotal = services.reduce(
    (s, sv) =>
      s +
      (sv.materials ?? []).reduce(
        (m, mat) => m + mat.sellPrice * mat.quantity,
        0,
      ),
    0,
  );
  const materialDiscount = services.reduce(
    (s, sv) =>
      s + (sv.materials ?? []).reduce((m, mat) => m + (mat.discount ?? 0), 0),
    0,
  );

  const subtotal = round2(laborSubtotal + materialSubtotal);
  const discount = round2(materialDiscount);
  const taxAdd = round2(materialSubtotal * (taxRateToUse / 100));
  const suppliesFeeAdd = round2(subtotal * (serviceFeeRateToUse / 100));
  const grandTotal = round2(subtotal - discount + taxAdd + suppliesFeeAdd);
  const due = grandTotal;

  // 3. Build items[] — each service → one InvoiceItem with labor + its materials.
  const items = services.map((s) => ({
    serviceDesc: s.serviceName,
    labor: {
      name: s.laborName ?? s.serviceName,
      hours: s.laborHours,
      charge: s.laborRate,
      discount: 0,
    },
    materials: (s.materials ?? []).map((mat) => ({
      name: mat.name,
      quantity: mat.quantity,
      sell: mat.sellPrice,
      cost: mat.costPrice ?? 0,
      discount: mat.discount ?? 0,
      ...(mat.productId != null ? { productId: mat.productId } : {}),
    })),
  }));

  // 4. Call the estimate creation route. tax/serviceFee stored as RATES (%).
  const result = await callInternalApi({
    method: "POST",
    path: `/api/estimate/${ctx.companyId}`,
    userId: ctx.userId,
    body: {
      type: "Estimate",
      clientId,
      vehicleId: vehicleId ?? undefined,
      subtotal,
      discount,
      tax: taxRateToUse,
      serviceFee: serviceFeeRateToUse,
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

  const totalMaterials = services.reduce(
    (s, sv) => s + (sv.materials?.length ?? 0),
    0,
  );

  return {
    ok: true,
    data: {
      estimateId,
      grandTotal,
      publicLink,
      editLink,
      message: `Estimate created with ${services.length} service${services.length > 1 ? "s" : ""}${totalMaterials > 0 ? ` and ${totalMaterials} material${totalMaterials > 1 ? "s" : ""}` : ""}. Total: $${grandTotal.toFixed(2)}.`,
    },
  };
}

registerTool({
  name: "create_estimate",
  description:
    "Create a draft ESTIMATE (not an invoice) for a client with one or more services and labor. Optionally include materials nested under each service. Totals (including tax on materials) are computed server-side — never pass a dollar total. Returns estimateId, grandTotal, publicLink, and editLink.",
  permission: "estimate.create",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      clientId: {
        type: "number",
        description:
          "The numeric client ID. Resolve with get_client_by_name first.",
      },
      vehicleId: {
        type: "number",
        description:
          "Optional vehicle ID. Use get_vehicle_by_client if you need to look it up.",
      },
      applyShopSupplies: {
        type: "boolean",
        description:
          "Pass false to exclude shop supplies from this estimate. Omit or pass true to apply the company shop-supplies rate.",
      },
      applyTax: {
        type: "boolean",
        description:
          "Pass false to exclude tax from this estimate. Omit or pass true to apply the company tax rate on materials.",
      },
      services: {
        type: "array",
        description:
          "One or more services. Each becomes a line item with labor and optional materials.",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            serviceName: {
              type: "string",
              description: "Free-text service description (e.g. 'Oil Change').",
            },
            laborHours: { type: "number", description: "Labor hours." },
            laborRate: {
              type: "number",
              description: "Hourly labor rate in dollars.",
            },
            laborName: {
              type: "string",
              description:
                "Optional labor line name if different from serviceName.",
            },
            materials: {
              type: "array",
              description: "Optional materials for this service.",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description:
                      "Material name (free-text, or from inventory).",
                  },
                  quantity: {
                    type: "number",
                    description: "Quantity (must be > 0).",
                  },
                  sellPrice: {
                    type: "number",
                    description: "Sell price per unit charged to the client.",
                  },
                  costPrice: {
                    type: "number",
                    description: "Optional cost price per unit (your cost).",
                  },
                  discount: {
                    type: "number",
                    description: "Optional dollar discount for this material.",
                  },
                  productId: {
                    type: "number",
                    description:
                      "Optional inventory product ID if resolved via get_inventory_item_by_name.",
                  },
                },
                required: ["name", "quantity", "sellPrice"],
              },
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
