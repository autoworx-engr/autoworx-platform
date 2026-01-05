import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    const infobipConfig = await db.infobipConfig.findFirst({
      where: { companyId },
    });

    if (!infobipConfig) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ phoneNumber: infobipConfig.phoneNumber });
  } catch (error: any) {
    console.error("Get Infobip phone number error:", error);
    return NextResponse.json(
      { error: "Failed to get phone number" },
      { status: 500 }
    );
  }
}
