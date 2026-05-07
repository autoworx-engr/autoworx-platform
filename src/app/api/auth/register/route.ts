import { register } from "@/actions/auth/register";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import httpStatus from "http-status";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      company,
      accessCode,
      timezone,
    } = reqBody;

    const registerUser = await register({
      firstName,
      lastName,
      email,
      password,
      company,
      accessCode,
      timezone,
    });

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
