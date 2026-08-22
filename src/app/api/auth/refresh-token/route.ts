import { db } from "@/lib/db";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/tokenGenerator";
import jwt from "jsonwebtoken";

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshAccessToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens generated
 *       401:
 *         description: Invalid token
 *       404:
 *         description: User not found
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const refreshAccessToken = body?.refreshAccessToken as string;
    if (!refreshAccessToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const refreshSecret = process.env.REFRESH_SECRET || "";

    if (!refreshSecret) {
      return new Response("Invalid token", { status: 500 });
    }

    const payload = jwt.verify(refreshAccessToken, refreshSecret);

    if (!payload || typeof payload !== "object" || !payload.email) {
      return Response.json(
        { message: "Invalid token", error: "InvalidRefreshTokenError" },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return Response.json(
        { message: "User not found", error: "UserNotFoundError" },
        { status: 404 },
      );
    }

    const newAccessToken = generateAccessToken(user) as string;
    const newRefreshToken = generateRefreshToken(user) as string;

    return Response.json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("refresh token request error:", error);
    return Response.json(
      { message: "Invalid Refresh Token", error: "InvalidRefreshTokenError" },
      { status: 403 },
    );
  }
}
