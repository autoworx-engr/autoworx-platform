import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: { email: string } },
) {
  const raw = context.params?.email;
  const email = raw ? decodeURIComponent(raw) : "";

  if (!email) {
    return NextResponse.json(
      { message: "Email not provided", status: 404 },
      { status: 400 },
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { email: true, role: true, employeeType: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found", status: 404 });
    }

    return NextResponse.json({ status: 200, data: user });
  } catch {
    return NextResponse.json({ message: "Something went wrong", status: 500 });
  }
}
