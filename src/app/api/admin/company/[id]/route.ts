import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET single company information
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const companyId = Number(params.id);

    if (!companyId || isNaN(companyId)) {
      return NextResponse.json(
        { message: "Invalid company id" },
        { status: 400 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSalesAgent: true,
        businessType: true,
        industry: true,
        website: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    console.error("GET COMPANY ERROR:", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
