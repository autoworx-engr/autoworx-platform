import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/ai-train/conversation-examples:
 *   post:
 *     summary: Create conversation example
 *     tags: [Conversation Examples]
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
 *               - imageUrl
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               imageUrl:
 *                 type: string
 *                 example: https://cdn.example.com/uploads/image.png
 *               extractedText:
 *                 type: string
 *                 nullable: true
 *                 example: Hello, how can I help you?
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Example from customer support chat
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.companyId || !body.imageUrl) {
      return NextResponse.json(
        { success: false, message: "companyId and imageUrl are required" },
        { status: 400 },
      );
    }

    const data = await db.conversationExample.create({
      data: {
        companyId: body.companyId,
        imageUrl: body.imageUrl,
        extractedText: body.extractedText,
        notes: body.notes,
      },
    });

    return NextResponse.json(
      { success: true, message: "Conversation example created", data },
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
 * /api/ai-train/conversation-examples:
 *   get:
 *     summary: Get conversation examples by company
 *     tags: [Conversation Examples]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Retrieved successfully
 *       400:
 *         description: Validation error
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

    const data = await db.conversationExample.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation examples retrieved",
      data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
