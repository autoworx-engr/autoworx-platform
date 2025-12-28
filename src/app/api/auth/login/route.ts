import login from "@/actions/auth/login";
import { NextRequest, NextResponse } from "next/server";
import httpStatus from "http-status";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    const { email, password } = reqBody;

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
