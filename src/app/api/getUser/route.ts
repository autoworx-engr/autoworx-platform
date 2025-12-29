import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/getCurrentUser";

/**
 * @swagger
 * /api/getUser:
 *   get:
 *     summary: Get current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       500:
 *         description: Server error
 */
export async function GET() {
  try {
    const user = await getUserFromSession();
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.error();
  }
}
