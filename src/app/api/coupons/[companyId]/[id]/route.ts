import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/coupons/{companyId}/{id}:
 *   patch:
 *     summary: Update a coupon
 *     description: Updates an existing coupon that belongs to the given company.
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Coupon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - couponName
 *               - couponCode
 *               - discountType
 *               - discountValue
 *               - startDate
 *               - endDate
 *               - couponType
 *             properties:
 *               couponName:
 *                 type: string
 *                 example: "Summer Sale"
 *               couponCode:
 *                 type: string
 *                 example: "SUMMER20"
 *               discountType:
 *                 type: string
 *                 enum: [Fixed, Percentage, "$", "%"]
 *                 example: "Percentage"
 *               discountValue:
 *                 type: number
 *                 example: 20
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-08-31"
 *               couponType:
 *                 type: string
 *                 example: "multi-use"
 *     responses:
 *       200:
 *         description: Coupon updated successfully
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
 *                   example: Coupon updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid ID or missing fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – companyId mismatch
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Delete a coupon
 *     description: Permanently deletes a coupon that belongs to the given company.
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
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
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
 *                   example: Coupon deleted successfully
 *       400:
 *         description: Invalid coupon ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – companyId mismatch
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Internal server error
 */

function normalizeDiscountType(raw: string): "Fixed" | "Percentage" {
  if (raw === "$" || raw === "Fixed") return "Fixed";
  return "Percentage";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id: idParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const couponId = parseInt(idParam, 10);
    if (isNaN(couponId)) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon ID" },
        { status: 400 },
      );
    }

    const existing = await db.coupon.findUnique({ where: { id: couponId } });
    if (!existing || existing.companyId !== jwtCompanyId) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const {
      couponName,
      couponCode,
      discountType,
      discountValue,
      startDate,
      endDate,
      couponType,
    } = body;

    if (
      !couponName ||
      !couponCode ||
      !discountType ||
      discountValue === undefined ||
      !startDate ||
      !endDate ||
      !couponType
    ) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 },
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { success: false, message: "End date must be later than start date" },
        { status: 400 },
      );
    }

    const updated = await db.coupon.update({
      where: { id: couponId },
      data: {
        name: couponName,
        code: couponCode,
        discountType: normalizeDiscountType(discountType),
        discount: Number(discountValue).toFixed(2),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: couponType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("COUPON UPDATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update coupon" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id: idParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const couponId = parseInt(idParam, 10);
    if (isNaN(couponId)) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon ID" },
        { status: 400 },
      );
    }

    const existing = await db.coupon.findUnique({ where: { id: couponId } });
    if (!existing || existing.companyId !== jwtCompanyId) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 },
      );
    }

    await db.coupon.delete({ where: { id: couponId } });

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("COUPON DELETE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete coupon" },
      { status: 500 },
    );
  }
}
