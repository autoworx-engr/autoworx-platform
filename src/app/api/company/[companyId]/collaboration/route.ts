import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const companyId = Number(params.companyId);

    if (isNaN(companyId)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { isCollaborators } = body;

    if (typeof isCollaborators !== "boolean") {
      return NextResponse.json(
        { message: "isCollaborators must be boolean" },
        { status: 400 }
      );
    }

    const company = await db.company.update({
      where: { id: companyId },
      data: {
        isCollaborators,
      },
      select: {
        id: true,
        isCollaborators: true,
      },
    });

    revalidatePath("/dashboard/communication/collaboration");

    return NextResponse.json(
      {
        message: "Collaboration status updated",
        data: company,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /company/[id]/collaboration error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
