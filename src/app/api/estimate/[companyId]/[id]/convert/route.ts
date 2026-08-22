import { convertInvoice } from "@/actions/estimate/invoice/convert";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/convert:
 *   patch:
 *     summary: convert an estimate/invoice
 *     description: Convert an estimate/invoice that belongs to the given company and id
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allowInsufficientInventory:
 *                 type: boolean
 *                 example: false
 *                 description: When true, the conversion proceeds even if the inventory does not hold enough stock, taking quantities to or below zero. Omit the body entirely to keep the default (false).
 *     responses:
 *       200:
 *         description: Estimate converted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estimate converted successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid company ID or input
 *       404:
 *         description: Estimate/Invoice not found or does not belong to this company
 *       500:
 *         description: Internal server error
 *
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const converted = await convertInvoice(
      id,
      jwtCompanyId,
      (body as Record<string, unknown>)?.allowInsufficientInventory === true,
    );

    if (converted?.type === "error" || converted?.type === "globalError") {
      return NextResponse.json(
        { success: false, message: (converted as any).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estimate/Invoice converted successfully",
      data: converted,
    });
  } catch (error: any) {
    console.error("ESTIMATE/INVOICE converted ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to convert estimate/invoice",
      },
      { status: 500 },
    );
  }
}
