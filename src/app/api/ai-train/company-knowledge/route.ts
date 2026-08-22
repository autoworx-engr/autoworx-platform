import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCompanyId } from "../utils";
import { resourceLimits } from "worker_threads";

/**
 * @swagger
 * /api/ai-train/company-knowledge:
 *   get:
 *     summary: Get company knowledge records
 *     tags: [Company Knowledge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Company ID to scope records
 *     responses:
 *       200:
 *         description: Company knowledge retrieved successfully
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
 *                   example: Company Info retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(req: Request) {
  try {
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    const data = await db.companyInfo.findFirst({
      where: { companyId: Number(companyId) },
    });

    return NextResponse.json({
      success: true,
      message: "Company Info retrieved successfully",
      data: data || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/company-knowledge:
 *   post:
 *     summary: Create company knowledge
 *     tags: [Company Knowledge]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - shopName
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               shopName:
 *                 type: string
 *                 example: TC Customs Atlanta
 *               about:
 *                 type: string
 *                 example: Premier auto restyling shop specializing in vehicle wraps.
 *               address:
 *                 type: string
 *                 example: 123 Main St, City, State
 *               email:
 *                 type: string
 *                 example: info@yourshop.com
 *               phone:
 *                 type: string
 *                 example: "+1 (555) 123-4567"
 *               websiteUrl:
 *                 type: string
 *                 example: https://yourshop.com
 *               hours:
 *                 type: string
 *                 example: Mon-Fri 10:30am-6:00pm
 *               policies:
 *                 type: string
 *                 example: Terms, refunds, and liability notes.
 *               smsResponseDelayMin:
 *                 type: integer
 *                 example: 0
 *                 description: Minimum SMS response delay in seconds
 *               smsResponseDelayMax:
 *                 type: integer
 *                 example: 0
 *                 description: Maximum SMS response delay in seconds
 *     responses:
 *       200:
 *         description: CompanyInfo created successfully
 *       400:
 *         description: Company ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = Number(body?.companyId);

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }

    const data = {
      shopName: body.shopName,
      about: body.about,
      address: body.address,
      email: body.email,
      phone: body.phone,
      websiteUrl: body.websiteUrl,
      hours: body.hours,
      policies: body.policies,
    };
    // const companyKnowledge = await db.companyInfo.create({
    //     data,
    // })

    const existingInfo = await db.companyInfo.findFirst({
      where: { companyId },
    });

    let result;
    if (existingInfo) {
      // Update
      result = await db.companyInfo.update({
        where: { id: existingInfo.id },
        data: data,
      });
    } else {
      // Create
      result = await db.companyInfo.create({
        data: {
          companyId: companyId,
          ...data,
        },
      });
    }
    return NextResponse.json({
      success: true,
      message: existingInfo
        ? "Company settings updated"
        : "Company settings created",
      data: resourceLimits,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
