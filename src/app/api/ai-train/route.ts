import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/sales-agent:
 *   get:
 *     summary: Get all AI training data for a company
 *     tags: [AI Training]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *           enum: [all, playbooks, examples, documents, company, personality, sms, faqs]
 *         example: all
 *         description: Specific data to include (comma-separated or 'all' for everything)
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
 *                     playbooks:
 *                       type: array
 *                       items:
 *                         type: object
 *                     examples:
 *                       type: array
 *                       items:
 *                         type: object
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                     company:
 *                       type: object
 *       400:
 *         description: Company ID is required
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeParam = searchParams.get("include") || "all";

    const includes =
      includeParam === "all"
        ? [
            "playbooks",
            "examples",
            "documents",
            "company",
            "personality",
            "sms",
            "faqs",
          ]
        : includeParam.split(",").map((i) => i.trim());

    const result: Record<number, any> = {};

    // 1️⃣ Get all companies
    const companies = await db.companyInfo.findMany({
      select: { companyId: true, overallFaqs: true },
    });

    for (const company of companies) {
      const companyId = company.companyId;
      result[companyId] = {};

      // Company info
      if (includes.includes("company")) {
        result[companyId].company = company;
      }

      if (includes.includes("playbooks")) {
        result[companyId].playbooks = await db.servicePlaybook.findMany({
          where: { companyId },
          include: {
            category: true,
            pricingRules: true,
            faqs: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }

      if (includes.includes("examples")) {
        result[companyId].examples = await db.conversationExample.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
        });
      }

      if (includes.includes("documents")) {
        result[companyId].documents = await db.knowledgeBaseDocument.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
        });
      }

      if (includes.includes("personality")) {
        result[companyId].personality = await db.aiPersonality.findUnique({
          where: { companyId },
        });
      }

      if (includes.includes("sms")) {
        result[companyId].sms = await db.sMSDelay.findUnique({
          where: { companyId },
        });
      }

      if (includes.includes("faqs")) {
        result[companyId].faqs = company.overallFaqs || [];
      }
    }

    return NextResponse.json({
      success: true,
      message: "All AI training data retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching AI training data:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
