import login from "@/actions/auth/login";
import { NextRequest, NextResponse } from "next/server";
import httpStatus from "http-status";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { createRateLimiter, extractClientIp } from "@/lib/rateLimit";

// 20 login attempts per IP per 15 minutes
const ipLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 20 });
// 10 login attempts per email per 15 minutes
const emailLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  maxRequests: 10,
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
export async function POST(req: NextRequest) {
  const ip = extractClientIp(
    req.headers.get("x-forwarded-for"),
    req.headers.get("x-real-ip"),
  );

  const ipCheck = ipLimiter.check(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(ipCheck.retryAfterMs / 1000)),
        },
      },
    );
  }

  try {
    const reqBody = await req.json();
    const rawEmail = reqBody.email;
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const password = reqBody.password;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailCheck = emailLimiter.check(email);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(emailCheck.retryAfterMs / 1000)),
          },
        },
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    const loggedInUser = await login({
      email,
      password,
    });
    return NextResponse.json({
      statusCode: httpStatus.OK,
      message: "Login successful",
      data: loggedInUser,
    });
  } catch (err) {
    console.log("Auth Error", err);
    const error = errorHandler(err);
    const status = error.statusCode || httpStatus.UNAUTHORIZED;
    return NextResponse.json(error, { status });
  }
}
