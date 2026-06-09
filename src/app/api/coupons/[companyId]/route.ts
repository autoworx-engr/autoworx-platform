import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/coupons/{companyId}:
 *   get:
 *     summary: List all coupons for a company
 *     description: Returns all coupons that belong to the given company.
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
 *     responses:
 *       200:
 *         description: Coupons fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Create a new coupon
 *     description: Creates a coupon for the given company. discountType accepts "Fixed", "Percentage", "$", or "%".
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
 *       201:
 *         description: Coupon created successfully
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
 *                   example: Coupon created successfully
 *                 data:
 *                   type: object
 *       400:
 *         description: Missing or invalid fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error
 */

function normalizeDiscountType(raw: string): "Fixed" | "Percentage" {
  if (raw === "$" || raw === "Fixed") return "Fixed";
  return "Percentage";
}

export async function GET(
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

    const coupons = await db.coupon.findMany({
      where: { companyId: jwtCompanyId },
    });

    return NextResponse.json({ success: true, data: coupons });
  } catch (error) {
    console.error("COUPONS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch coupons" },
      { status: 500 },
    );
  }
}

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

    const coupon = await db.coupon.create({
      data: {
        companyId: jwtCompanyId,
        name: couponName,
        code: couponCode,
        discountType: normalizeDiscountType(discountType),
        discount: discountValue,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: couponType,
        redemptions: 0,
        status: "Active",
      },
    });

    return NextResponse.json(
      { success: true, message: "Coupon created successfully", data: coupon },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("COUPON CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create coupon" },
      { status: 500 },
    );
  }
}
