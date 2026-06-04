import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const companyId = await getCompanyId();

    await db.company.update({
      where: { id: companyId },
      data: {
        gbpAccessToken: null,
        gbpRefreshToken: null,
        gbpTokenExpiresAt: null,
        gbpAccountId: null,
      },
    });

    await db.gbpLocation.updateMany({
      where: { companyId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
