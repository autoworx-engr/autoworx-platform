import { checkInventoryForConversion } from "@/actions/estimate/invoice/checkInventory";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/inventory-check:
 *   get:
 *     summary: Check inventory before converting/authorizing an estimate
 *     description: Read-only pre-check that reports which products would take the inventory below zero if this estimate were converted or authorized. Writes nothing — mirrors the rules the convert/authorize write paths enforce, so a warning can be shown before the write is attempted.
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
 *     responses:
 *       200:
 *         description: Inventory check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     sufficient:
 *                       type: boolean
 *                       example: false
 *                     shortages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Brake Pad"
 *                           required:
 *                             type: number
 *                             example: 5
 *                           available:
 *                             type: number
 *                             example: 2
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error
 */

export async function GET(
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

    const result = await checkInventoryForConversion(id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("ESTIMATE INVENTORY CHECK ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check inventory" },
      { status: 500 },
    );
  }
}
