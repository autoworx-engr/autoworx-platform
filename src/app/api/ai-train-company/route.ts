import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train-company:
 *   get:
 *     summary: Get all AI training data for a specific company
 *     tags: [AI Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: number
 *         example: 1
 *         description: Company ID to fetch training data for
 *     responses:
 *       200:
 *         description: AI training data retrieved successfully
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
 *                   example: AI training data retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: object
 *                       properties:
 *                         companyId:
 *                           type: number
 *                         overallFaqs:
 *                           type: array
 *                     playbooks:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: All service playbooks for the company
 *                     examples:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: All conversation examples for the company
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: All knowledge base documents for the company
 *                     personality:
 *                       type: object
 *                       description: AI personality settings for the company
 *                     sms:
 *                       type: object
 *                       description: SMS delay settings for the company
 *                     faqs:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: All FAQs for the company
 *       400:
 *         description: Bad request - Company ID is required and must be a valid number
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       404:
 *         description: Sales agent is not configured for this company
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Your sales agent isn't set up yet. Please configure it from Settings to start using AI training.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("companyId");

    // Validate companyId parameter
    if (!companyIdParam) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }

    const companyId = parseInt(companyIdParam, 10);
    if (isNaN(companyId) || companyId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Company ID must be a valid positive number",
        },
        { status: 400 },
      );
    }

    // Get company info
    const company = await db.company.findUnique({
      where: { id: companyId },
    });
    const companyInfo = await db.companyInfo.findUnique({
      where: { companyId },
    });

    // Company info is created when the sales agent is set up
    if (!companyInfo) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your sales agent isn't set up yet. Please configure it from Settings to start using sales agent.",
        },
        { status: 404 },
      );
    }

    // Fetch all AI training data for the company in parallel
    const [playbooks, examples, documents, personality, sms] =
      await Promise.all([
        db.servicePlaybook.findMany({
          where: { companyId },
          include: {
            category: true,
            pricingRules: true,
            faqs: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        db.conversationExample.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
        }),
        db.knowledgeBaseDocument.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
        }),
        db.aiPersonality.findUnique({
          where: { companyId },
        }),
        db.sMSDelay.findUnique({
          where: { companyId },
        }),
      ]);

    const faqs = companyInfo.overallFaqs || [];

    const {
      // id: companyInfoId,
      overallFaqs,
      pricing,
      services,
      ...companyInfoRest
    } = companyInfo;

    const formattedCompany = {
      ...company,
      // companyInfoId,
      ...companyInfoRest,
    };

    return NextResponse.json({
      success: true,
      message: "AI training data retrieved successfully",
      data: {
        company,
        companyInfo: companyInfoRest,
        playbooks,
        conversationAttachments: examples,
        knowledgeBaseDocument: documents,
        personality,
        sms,
        overallFaqs: faqs,
      },
    });
  } catch (error) {
    console.error("Error fetching AI training data:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
