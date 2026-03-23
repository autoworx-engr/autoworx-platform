import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCompanyId } from "../utils";

/**
 * @swagger
 * /api/ai-train/faq:
 *   get:
 *     summary: Get overall FAQs for company
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Company ID to scope FAQs
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Company ID is required
 *       404:
 *         description: Company info not found
 *       500:
 *         description: Internal server error
 */
export async function GET(req: Request) {
  try {
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    const companyInfo = await db.companyInfo.findFirst({
      where: { companyId },
      select: {
        overallFaqs: true,
      },
    });

    if (!companyInfo) {
      return NextResponse.json(
        { success: false, message: "Company info not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "FAQs retrieved successfully",
      data: companyInfo.overallFaqs || [],
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
 * /api/ai-train/faq:
 *   post:
 *     summary: Create or update overall FAQs for company
 *     tags: [FAQ]
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
 *               - faqs
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               faqs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *                 example:
 *                   - question: "Do you offer warranties?"
 *                     answer: "Yes, we offer 3-year warranties on all services."
 *                   - question: "What are your business hours?"
 *                     answer: "Mon-Fri 10:30am-6:00pm"
 *     responses:
 *       200:
 *         description: FAQs created/updated successfully
 *       400:
 *         description: Company ID and FAQs are required
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.companyId || !body?.faqs) {
      return NextResponse.json(
        { success: false, message: "Company ID and FAQs are required" },
        { status: 400 },
      );
    }

    // Check if company info exists
    let companyInfo = await db.companyInfo.findFirst({
      where: { companyId: Number(body.companyId) },
    });

    if (!companyInfo) {
      return NextResponse.json(
        {
          success: false,
          message: "Company info not found. Create company info first.",
        },
        { status: 404 },
      );
    }

    // Update or create FAQs
    const updatedInfo = await db.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        overallFaqs: body.faqs,
      },
    });

    return NextResponse.json({
      success: true,
      message: "FAQs created/updated successfully",
      data: updatedInfo.overallFaqs,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
