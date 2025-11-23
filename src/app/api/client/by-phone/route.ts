import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Find client by phone number
    const client = await db.client.findFirst({
      where: {
        companyId: session.user.companyId,
        mobile: {
          contains: phone.replace(/\D/g, ""), // Remove non-digits
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Error fetching client by phone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
