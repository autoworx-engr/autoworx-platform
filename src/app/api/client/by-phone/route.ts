import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { phoneLookupWhereClause } from "@/utils/normalizePhone";

/**
 * @swagger
 * /api/client/by-phone:
 *   get:
 *     summary: Find client by phone number
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client found
 *       400:
 *         description: Phone number required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    // Find client by phone number using normalized lookup
    const phoneLookup = phoneLookupWhereClause(phone);
    const client = phoneLookup
      ? await db.client.findFirst({
          where: {
            companyId: session.user.companyId,
            OR: phoneLookup,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobile: true,
          },
        })
      : null;

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Error fetching client by phone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
