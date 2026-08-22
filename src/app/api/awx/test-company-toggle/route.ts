import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  assertSuperAdmin,
  requireBillingSession,
} from "@/lib/platform-billing/guards";

export async function POST(req: NextRequest) {
  try {
    const session = await requireBillingSession();
    assertSuperAdmin(session);

    const body = await req.json();
    const companyId = Number(body?.companyId);
    const isTest = Boolean(body?.isTest);

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company not found" },
        { status: 404 },
      );
    }

    await db.company.update({
      where: { id: companyId },
      data: { isTest },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || "Failed to update company";
    if (message === "Unauthorized") {
      return NextResponse.json({ success: false, message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
