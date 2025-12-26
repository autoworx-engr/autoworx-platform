import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.json();
    console.log("Login Request Body:", reqBody);
    return NextResponse.json({
      message: "Login successful",
      data: reqBody,
    });
  } catch (err) {
    console.log("Auth Error", err);
    return NextResponse.json(
      { error: "Invalid Refresh Token" },
      { status: 403 }
    );
  }
}
