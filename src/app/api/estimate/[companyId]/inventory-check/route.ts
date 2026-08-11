import {
  checkInventoryForInvoiceSave,
  type MaterialLike,
} from "@/actions/estimate/invoice/checkInventory";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { InvoiceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/inventory-check:
 *   post:
 *     summary: Check inventory before saving an estimate/invoice
 *     description: Read-only pre-check for the create/edit screen, where the materials are still in the client. Writes nothing. A document that is already an Invoice is checked against the "would this leave stock at or below zero" rule, since it has already drawn its materials out; anything else only counts against stock once it lands as an Invoice.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - materials
 *               - targetType
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *                 description: Existing invoice/estimate being edited. Omit when creating.
 *               targetType:
 *                 type: string
 *                 enum: [Estimate, Invoice]
 *                 example: "Invoice"
 *                 description: Type the document is being saved as
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: integer, example: 12 }
 *                     quantity: { type: number, example: 5 }
 *                     name: { type: string, example: "Brake Pad" }
 *                     sell: { type: number, example: 30 }
 *     responses:
 *       200:
 *         description: Inventory check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     sufficient: { type: boolean, example: false }
 *                     shortages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name: { type: string, example: "Brake Pad" }
 *                           required: { type: number, example: 5 }
 *                           available: { type: number, example: 2 }
 *       400:
 *         description: Invalid company ID or input
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const { invoiceId, materials, targetType } = body as {
      invoiceId?: string;
      materials?: MaterialLike[];
      targetType?: string;
    };

    if (
      targetType !== InvoiceType.Estimate &&
      targetType !== InvoiceType.Invoice
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "targetType must be either 'Estimate' or 'Invoice'",
        },
        { status: 400 },
      );
    }

    const result = await checkInventoryForInvoiceSave({
      invoiceId,
      materials: Array.isArray(materials) ? materials : [],
      targetType,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("ESTIMATE SAVE INVENTORY CHECK ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check inventory" },
      { status: 500 },
    );
  }
}
