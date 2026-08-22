import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/knowledge-base-documents/{id}:
 *   get:
 *     summary: Get knowledge base document by ID
 *     tags: [Knowledge Base Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Document fetched successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */

export async function GET(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const id = Number(params.id);

  const document = await db.knowledgeBaseDocument.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json(
      { success: false, message: "Document not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Document retrieved successfully",
    data: document,
  });
}

/**
 * @swagger
 * /api/ai-train/knowledge-base-documents/{id}:
 *   patch:
 *     summary: Update a knowledge base document
 *     tags: [Knowledge Base Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Refund Policy"
 *               category:
 *                 type: string
 *                 example: "Policy"
 *               content:
 *                 type: string
 *                 example: "Refunds are allowed within 14 days."
 *               status:
 *                 type: string
 *                 example: "inactive"
 *               fileName:
 *                 type: string
 *                 example: "refund-v2.pdf"
 *               fileType:
 *                 type: string
 *                 example: "application/pdf"
 *               fileUrl:
 *                 type: string
 *                 example: "https://cdn.example.com/refund-v2.pdf"
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const id = Number(params.id);
    const body = await req.json();

    const exists = await db.knowledgeBaseDocument.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Document not found" },
        { status: 404 },
      );
    }

    const updated = await db.knowledgeBaseDocument.update({
      where: { id },
      data: {
        title: body.title,
        category: body.category,
        content: body.content,
        status: body.status,
        fileName: body.fileName,
        fileType: body.fileType,
        fileUrl: body.fileUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
      data: updated,
    });
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
 * /api/ai-train/knowledge-base-documents/{id}:
 *   delete:
 *     summary: Delete a knowledge base document
 *     tags: [Knowledge Base Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */

export async function DELETE(
  _: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const id = Number(params.id);

    await db.knowledgeBaseDocument.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
