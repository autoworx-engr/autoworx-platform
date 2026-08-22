/**
 * @swagger
 * /api/ai-train/sms-delay:
 *   post:
 *     summary: Create or update SMS delay for a company
 *     tags: [SMS Delay]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: integer
 *                 description: The company ID
 *                 example: 1
 *               smsResponseDelayMin:
 *                 type: integer
 *                 description: Minimum SMS response delay (seconds)
 *                 example: 10
 *               smsResponseDelayMax:
 *                 type: integer
 *                 description: Maximum SMS response delay (seconds)
 *                 example: 60
 *     responses:
 *       200:
 *         description: SMS delay created or updated
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 *   get:
 *     summary: Get SMS delay for a company
 *     tags: [SMS Delay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: The company ID
 *     responses:
 *       200:
 *         description: SMS delay found
 *       400:
 *         description: Bad request
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Create or update SMSDelay for a company
export async function POST(req: NextRequest) {
  try {
    const { companyId, smsResponseDelayMin, smsResponseDelayMax } =
      await req.json();
    if (
      !companyId ||
      typeof smsResponseDelayMin !== "number" ||
      typeof smsResponseDelayMax !== "number"
    ) {
      return NextResponse.json(
        {
          error:
            "companyId, smsResponseDelayMin, smsResponseDelayMax are required.",
        },
        { status: 400 },
      );
    }
    const smsDelay = await db.sMSDelay.upsert({
      where: { companyId },
      update: { smsResponseDelayMin, smsResponseDelayMax },
      create: { companyId, smsResponseDelayMin, smsResponseDelayMax },
    });
    return NextResponse.json(smsDelay);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 },
    );
  }
}

// Get SMSDelay for a company
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = Number(searchParams.get("companyId"));
    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required." },
        { status: 400 },
      );
    }
    const smsDelay = await db.sMSDelay.findUnique({ where: { companyId } });
    if (!smsDelay) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(smsDelay);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 },
    );
  }
}
