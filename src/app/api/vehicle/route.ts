import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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
      notes,
      clientId,
      companyId,
    } = body;

    if (!year || !make || !model || !clientId || !companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "year, make, model, clientId, companyId are required",
        },
        { status: 400 },
      );
    }

    const existing = await db.vehicle.findFirst({
      where: {
        clientId: Number(clientId),
        year: Number(year),
        make,
        model,
        companyId: Number(companyId),
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const vehicle = await db.vehicle.create({
      data: {
        year: Number(year),
        make,
        model,
        submodel: submodel || undefined,
        type: type || undefined,
        colorId: colorId ?? undefined,
        transmission: transmission || undefined,
        engineSize: engineSize || undefined,
        license: license || undefined,
        vin: vin || undefined,
        notes: notes || undefined,
        clientId: Number(clientId),
        companyId: Number(companyId),
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
