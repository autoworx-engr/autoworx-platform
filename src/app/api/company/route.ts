import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/company:
 *   get:
 *     summary: Get all companies
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all companies
 *       500:
 *         description: Server error
 */
export async function GET(req: Request) {
  try {
    const allCompanies = await db.company.findMany({});
    return NextResponse.json(allCompanies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: "All company fetch failed" },
      { status: 500 },
    );
  }
}
