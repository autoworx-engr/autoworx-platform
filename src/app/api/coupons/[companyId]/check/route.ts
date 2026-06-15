import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/coupons/{companyId}/check:
 *   post:
 *     summary: Check if a coupon code is valid
 *     description: Validates a coupon code for a specific client — checks that the coupon exists, has not expired, and has not already been used by that client.
 *     tags:
 *       - Coupons
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
 *               - code
 *               - clientId
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SUMMER20"
 *                 description: The coupon code to validate
 *               clientId:
 *                 type: integer
 *                 example: 7
 *                 description: The ID of the client redeeming the coupon
 *     responses:
 *       200:
 *         description: Coupon is valid
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
 *                   example: Coupon is valid
 *                 data:
 *                   type: object
 *                   description: The coupon record
 *       400:
 *         description: Missing required fields or invalid company ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – companyId mismatch
 *       404:
 *         description: Coupon does not exist
 *       409:
 *         description: Coupon has expired or already been used by this client
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

    const body = await req.json();
    const { code, clientId } = body;

    if (!code || clientId === undefined) {
      return NextResponse.json(
        { success: false, message: "code and clientId are required" },
        { status: 400 },
      );
    }

    const coupon = await db.coupon.findFirst({ where: { code } });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Coupon does not exist" },
        { status: 404 },
      );
    }

    if (coupon.endDate < new Date()) {
      return NextResponse.json(
        { success: false, message: "Coupon has expired" },
        { status: 409 },
      );
    }

    const alreadyUsed = await db.clientCoupon.findFirst({
      where: { clientId, couponId: coupon.id },
    });

    if (alreadyUsed) {
      return NextResponse.json(
        { success: false, message: "Coupon has already been used" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coupon is valid",
      data: coupon,
    });
  } catch (error: any) {
    console.error("COUPON CHECK ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to check coupon" },
      { status: 500 },
    );
  }
}
