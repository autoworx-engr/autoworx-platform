import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || "10")),
    );
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where: { companyId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + invoices.length < total,
      },
    });
  } catch (error) {
    console.error("INVOICE COMPANY LIST ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
