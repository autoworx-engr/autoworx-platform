import { register } from "@/actions/auth/register";
import { NextRequest, NextResponse } from "next/server";
import httpStatus from "http-status";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { registerRequestValidation } from "@/validations/schemas/auth/user.validation";

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               company:
 *                 type: string
 *               accessCode:
 *                 type: string
 *               timezone:
 *                 type: string
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - company
 *               - accessCode
 *               - timezone
 *     responses:
 *       200:
 *         description: Registration successful
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
 */

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();

    // Validate before the action runs. A ZodError is turned into a 400 with
    // per-field errorSource entries by errorHandler below, so a bad body never
    // reaches the database work.
    const payload = await registerRequestValidation.parseAsync(reqBody);

    const registerUser = await register(payload);

    return NextResponse.json({
      statusCode: httpStatus.OK,
      message: "Registration successful",
      data: registerUser,
    });
  } catch (err) {
    console.log("Auth Error", err);
    const error = errorHandler(err);
    const status = error.statusCode || httpStatus.UNAUTHORIZED;
    return NextResponse.json(error, { status });
  }
}
