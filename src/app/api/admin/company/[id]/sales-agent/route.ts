import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const companyId = Number(params.id);
    const { isSalesAgent } = await req.json();

    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    // If turning OFF → disable all clients
    if (isSalesAgent === false) {
      await db.$transaction([
        db.company.update({
          where: { id: companyId },
          data: { isSalesAgent: false },
        }),
        db.client.updateMany({
          where: { companyId },
          data: { isSalesAgent: false },
        }),
      ]);
    } else {
      await db.company.update({
        where: { id: companyId },
        data: { isSalesAgent: true },
      });
    }

    return NextResponse.json({
      message: "Company sales agent permission updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}
