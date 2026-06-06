import { z } from "zod";
import { db } from "@/lib/db";
import { round2 } from "@/lib/copilot/estimateMath";
import {
  registerTool,
  type ToolContext,
  type ToolResult,
} from "@/lib/copilot/tools/registry";

const inputSchema = z.object({
  estimateId: z.string().min(1),
  serviceItemId: z.number().int().positive(),
  materials: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        sellPrice: z.number().nonnegative(),
        costPrice: z.number().nonnegative().optional(),
        discount: z.number().nonnegative().optional(),
        productId: z.number().int().positive().optional(),
        vendorId: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});

type Input = z.infer<typeof inputSchema>;

async function execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
  const { estimateId, serviceItemId, materials } = input as Input;

  // 1. Fetch estimate + all existing items with labor + materials.
  const estimate = await db.invoice.findFirst({
    where: { id: estimateId, companyId: ctx.companyId },
    include: {
      invoiceItems: {
        include: { labor: true, materials: true },
      },
    },
  });

  if (!estimate) {
    return {
      ok: false,
      error: `Estimate ${estimateId} not found in your company. Resolve the client with get_client_by_name, then list estimates with get_estimates_for_client to get the correct estimateId.`,
    };
  }

  // 2. Only draft Estimates are editable.
  if (estimate.type !== "Estimate") {
    return {
      ok: false,
      error: `${estimateId} is an Invoice, not a draft estimate. Materials can only be added to draft estimates (type "Estimate").`,
    };
  }

  // 3. Validate serviceItemId belongs to this estimate.
  const targetItem = estimate.invoiceItems.find(
    (it) => it.id === serviceItemId,
  );
  if (!targetItem) {
    return {
      ok: false,
      error: `Service item ${serviceItemId} was not found on estimate ${estimateId}. Call get_estimate_by_number to see the estimate's items and their IDs.`,
    };
  }

  // 4. Look up company tax/serviceFee rates from DB — never from AI input.
  const company = await db.company.findUnique({
    where: { id: ctx.companyId },
    select: { tax: true, serviceFee: true },
  });
  const taxRate = Number(company?.tax ?? 0);
  const serviceFeeRate = Number(company?.serviceFee ?? 0);

  // 5. Recompute totals from scratch: all existing items + new materials.
  const existingLaborSubtotal = estimate.invoiceItems.reduce(
    (s, it) =>
      s + (it.labor ? Number(it.labor.charge) * Number(it.labor.hours) : 0),
    0,
  );
  const existingMaterialSubtotal = estimate.invoiceItems.reduce(
    (s, it) =>
      s +
      it.materials.reduce(
        (m, mat) => m + Number(mat.sell ?? 0) * Number(mat.quantity ?? 0),
        0,
      ),
    0,
  );
  const existingMaterialDiscount = estimate.invoiceItems.reduce(
    (s, it) =>
      s + it.materials.reduce((m, mat) => m + Number(mat.discount ?? 0), 0),
    0,
  );

  const newMaterialSubtotal = materials.reduce(
    (s, m) => s + m.sellPrice * m.quantity,
    0,
  );
  const newMaterialDiscount = materials.reduce(
    (s, m) => s + (m.discount ?? 0),
    0,
  );

  const materialSubtotal = round2(
    existingMaterialSubtotal + newMaterialSubtotal,
  );
  const subtotal = round2(existingLaborSubtotal + materialSubtotal);
  const discount = round2(existingMaterialDiscount + newMaterialDiscount);
  const taxAdd = round2(materialSubtotal * (taxRate / 100));
  const suppliesFeeAdd = round2(subtotal * (serviceFeeRate / 100));
  const grandTotal = round2(subtotal - discount + taxAdd + suppliesFeeAdd);

  // 6. Write: attach Material rows to EXISTING service InvoiceItem + update totals.
  //    Direct DB write — the PATCH route only updates header fields, not items.
  await db.$transaction(async (tx) => {
    for (const mat of materials) {
      await tx.material.create({
        data: {
          name: mat.name,
          quantity: mat.quantity,
          sell: mat.sellPrice,
          cost: mat.costPrice ?? 0,
          discount: mat.discount ?? 0,
          ...(mat.productId != null ? { productId: mat.productId } : {}),
          ...(mat.vendorId != null ? { vendorId: mat.vendorId } : {}),
          companyId: ctx.companyId,
          invoiceId: estimateId,
          invoiceItemId: serviceItemId,
        },
      });
    }

    await tx.invoice.update({
      where: { id: estimateId },
      data: {
        subtotal,
        discount,
        tax: taxRate,
        serviceFee: serviceFeeRate,
        grandTotal,
        due: grandTotal,
      },
    });
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return {
    ok: true,
    data: {
      estimateId,
      serviceItemId,
      materialsAdded: materials.length,
      grandTotal,
      publicLink: `${appUrl}/public-invoice/${estimateId}`,
      editLink: `/dashboard/estimate/edit/${estimateId}`,
      message: `Added ${materials.length} material${materials.length > 1 ? "s" : ""} to estimate. New total: $${grandTotal.toFixed(2)}.`,
    },
  };
}

registerTool({
  name: "add_materials_to_estimate",
  description:
    "Add one or more materials to an existing service on a DRAFT estimate (type Estimate, not Invoice). Materials are attached to the specified service InvoiceItem; totals are recomputed from all existing items plus the new materials. Use when the user wants to add parts or supplies to an estimate that has already been created.",
  permission: "estimate.add_materials",
  inputSchema,
  anthropicInputSchema: {
    type: "object" as const,
    properties: {
      estimateId: {
        type: "string",
        description:
          "The estimate ID (from get_estimates_for_client or create_estimate). Must be a draft Estimate, not an Invoice.",
      },
      serviceItemId: {
        type: "number",
        description:
          "The InvoiceItem id of the service to attach materials to. Get this from get_estimate_by_number — each item in the response has an id field. Ask the user which service the material belongs to when the estimate has multiple services.",
      },
      materials: {
        type: "array",
        minItems: 1,
        description: "One or more materials to add to the estimate.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Material name (free-text, or resolved from inventory).",
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
              description:
                "Optional cost price per unit (your cost, for profit tracking).",
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
            vendorId: {
              type: "number",
              description:
                "Optional vendor ID if resolved via get_vendor_by_name.",
            },
          },
          required: ["name", "quantity", "sellPrice"],
        },
      },
    },
    required: ["estimateId", "serviceItemId", "materials"],
  },
  execute,
});
