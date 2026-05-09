import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCompanyId } from "../utils";

/**
 * @swagger
 * /api/ai-train/personality:
 *   get:
 *     summary: Get AI personality config for company
 *     tags: [Personality]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Company ID to scope config
 *     responses:
 *       200:
 *         description: Personality config retrieved successfully
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

    const personality = await db.aiPersonality.findFirst({
      where: { companyId },
    });
    if (!personality) {
      return NextResponse.json(
        { success: false, message: "AI personality not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      message: "AI personality retrieved successfully",
      data: personality,
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
 * /api/ai-train/personality:
 *   post:
 *     summary: Update AI personality config for company
 *     tags: [Personality]
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
 *             properties:
 *               companyId:
 *                 type: integer
 *                 example: 1
 *               personalName:
 *                 type: string
 *               personalType:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               openingMessage:
 *                 type: string
 *               conversationStyle:
 *                 type: object
 *               personality:
 *                 type: object
 *     responses:
 *       200:
 *         description: Personality config updated successfully
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
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = Number(body.companyId);
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }
    const data = {
      companyId,
      personalType: body.personalType,
      warmth: Number(body.warmth),
      humor: Number(body.humor),
      energy: Number(body.energy),
      assistantName: body.assistantName,
      useContractions: body.useContractions,
      useCasualLanguage: body.useCasualLanguage,
      matchCustomerTone: body.matchCustomerTone,
      useEmojis: body.useEmojis,
      openingMessage: body.openingMessage,
      humanHandoffMessage: body.humanHandoffMessage,
      systemPrompt: body.systemPrompt,
    };
    const existing = await db.aiPersonality.findFirst({ where: { companyId } });
    let result;
    if (existing) {
      result = await db.aiPersonality.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await db.aiPersonality.create({ data });
    }
    return NextResponse.json({
      success: true,
      message: "AI personality saved successfully",
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
