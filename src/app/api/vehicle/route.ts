import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const companyId = principal.companyId;

    const body = await req.json();
    const {
      year,
      make,
      model,
      submodel,
      type,
      colorId,
      transmission,
      engineSize,
      license,
      vin,
      other,
      notes,
      clientId,
    } = body;

    // Match web: either "other" is provided, or all of year/make/model are.
    const hasOther = !!other?.trim();
    const hasYmm = !!year && !!make && !!model;
    if (!clientId || (!hasOther && !hasYmm)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "clientId and either 'other' or year+make+model are required",
        },
        { status: 400 },
      );
    }

    const client = await db.client.findFirst({
      where: { id: Number(clientId), companyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    // Only de-dupe a fully specified vehicle; "other"-only entries are free text.
    if (hasYmm) {
      const existing = await db.vehicle.findFirst({
        where: {
          clientId: Number(clientId),
          year: Number(year),
          make,
          model,
          companyId,
        },
      });

      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }
    }

    const vehicle = await db.vehicle.create({
      data: {
        year: year ? Number(year) : undefined,
        make: make || undefined,
        model: model || undefined,
        submodel: submodel || undefined,
        type: type || undefined,
        colorId: colorId ?? undefined,
        transmission: transmission || undefined,
        engineSize: engineSize || undefined,
        license: license || undefined,
        vin: vin || undefined,
        other: other?.trim() || undefined,
        notes: notes || undefined,
        clientId: Number(clientId),
        companyId,
      },
    });

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create vehicle" },
      { status: 500 },
    );
  }
}
