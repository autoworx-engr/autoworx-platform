import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import {
  buildAddressFromGbp,
  fetchGbpLocations,
  getValidGbpToken,
} from "@/lib/gbp";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    const locations = await db.gbpLocation.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: locations });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

// POST: re-sync locations from Google
export async function POST() {
  try {
    const companyId = await getCompanyId();
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { gbpAccountId: true },
    });

    if (!company?.gbpAccountId) {
      return NextResponse.json(
        { success: false, message: "GBP not connected" },
        { status: 400 },
      );
    }

    const accessToken = await getValidGbpToken(companyId);
    const data = await fetchGbpLocations(accessToken, company.gbpAccountId);
    const locations = data.locations ?? [];

    for (const loc of locations) {
      const googleLocationId = loc.name.split("/").pop() as string;
      await db.gbpLocation.upsert({
        where: {
          companyId_googleLocationId: { companyId, googleLocationId },
        },
        create: {
          companyId,
          googleLocationId,
          googleAccountId: company.gbpAccountId,
          name: loc.title ?? googleLocationId,
          address: buildAddressFromGbp(loc.storefrontAddress),
        },
        update: {
          name: loc.title ?? googleLocationId,
          address: buildAddressFromGbp(loc.storefrontAddress),
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { count: locations.length },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
