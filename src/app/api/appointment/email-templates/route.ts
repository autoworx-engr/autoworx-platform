import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { EmailTemplateType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const companyId = Number(req.nextUrl.searchParams.get("companyId"));
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId required" },
        { status: 400 },
      );
    }
    const data = await db.emailTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subject, message, type, companyId } = await req.json();
    if (!subject?.trim() || !type || !companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "subject, type, and companyId are required",
        },
        { status: 400 },
      );
    }
    const data = await db.emailTemplate.create({
      data: {
        subject: subject.trim(),
        message: message?.trim() ?? "",
        type: type as EmailTemplateType,
        companyId: Number(companyId),
      },
    });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
