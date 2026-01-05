import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/auth/zap-login:
 *   post:
 *     summary: Zapier token login
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: X-TOKEN
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company info returned
 *       401:
 *         description: Invalid token
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("X-TOKEN");

    if (!token) {
      return NextResponse.json("Invalid token", { status: 401 });
    }

    // Check if there any company with the token
    const company = await db.company.findFirst({
      where: {
        zapierToken: token,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // return success response
    return NextResponse.json({
      type: "success",
      name: company.name,
    });
  } catch (error: any) {
    return NextResponse.json("Invalid token", { status: 401 });
  }
}
