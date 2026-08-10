import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/auth/user/{email}:
 *   get:
 *     summary: Get user by email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function GET(
  _request: NextRequest,
  searchParams: { params: Promise<{ email: string }> },
) {
  const email = (await searchParams?.params)?.email;

  if (!email) {
    return NextResponse.json({
      message: "Email doesn't provided",
      status: 404,
    });
  }
  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        email: true,
        role: true,
        employeeType: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        message: "User not found",
        status: 404,
      });
    }

    return NextResponse.json({
      status: 200,
      data: user,
    });
  } catch (err) {
    return NextResponse.json({
      message: "Something was wrong",
      status: 500,
    });
  }
}
