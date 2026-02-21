import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/knowledge-base-documents:
 *   post:
 *     summary: Create a knowledge base document
 *     tags: [Knowledge Base Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - content
 *               - status
 *               - companyId
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Refund Policy"
 *               category:
 *                 type: string
 *                 example: "Policy"
 *               content:
 *                 type: string
 *                 example: "Customers can request refunds within 7 days."
 *               status:
 *                 type: string
 *                 example: "active"
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               fileName:
 *                 type: string
 *                 example: "refund-policy.pdf"
 *               fileType:
 *                 type: string
 *                 example: "application/pdf"
 *               fileUrl:
 *                 type: string
 *                 example: "https://cdn.example.com/refund-policy.pdf"
 *     responses:
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      !body.companyId ||
      !body.title ||
      !body.category ||
      !body.content ||
      !body.status
    ) {
      return NextResponse.json(
        { success: false, message: "Required fields are missing" },
        { status: 400 },
      );
    }

    const document = await db.knowledgeBaseDocument.create({
      data: {
        companyId: body.companyId,
        title: body.title,
        category: body.category,
        content: body.content,
        status: body.status,
        fileName: body.fileName,
        fileType: body.fileType,
        fileUrl: body.fileUrl,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Knowledge base document created successfully",
        data: document,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/ai-train/knowledge-base-documents:
 *   get:
 *     summary: Get all knowledge base documents
 *     tags: [Knowledge Base Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           example: Policy
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: active
 *     responses:
 *       200:
 *         description: List of documents
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = Number(searchParams.get("companyId"));

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const documents = await db.knowledgeBaseDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Knowledge base documents retrieved successfully",
      data: documents,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
