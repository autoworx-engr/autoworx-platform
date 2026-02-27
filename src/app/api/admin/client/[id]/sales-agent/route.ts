import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const clientId = Number(params.id);
    const { isSalesAgent } = await req.json();

    const client = await db.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: client.companyId },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    // If turning ON client but company is OFF
    if (isSalesAgent === true && company.isSalesAgent === false) {
      await db.$transaction([
        db.company.update({
          where: { id: company.id },
          data: { isSalesAgent: true },
        }),
        db.client.update({
          where: { id: clientId },
          data: { isSalesAgent: true },
        }),
      ]);
    } else {
      await db.client.update({
        where: { id: clientId },
        data: { isSalesAgent },
      });
    }

    return NextResponse.json({
      message: "Client sales agent permission updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error", error },
      { status: 500 },
    );
  }
}
