import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  companyName: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = await getCompanyIdFromBearer(req);
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      companyName,
      name,
      email,
      phone,
      website,
      address,
      city,
      state,
      zip,
      notes,
    } = parsed.data;

    const existing = await db.vendor.findFirst({
      where: {
        companyId,
        companyName: { equals: companyName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A vendor named '${companyName}' already exists.`,
        },
        { status: 409 },
      );
    }

    const vendor = await db.vendor.create({
      data: {
        companyName,
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        website: website ?? null,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
        notes: notes ?? null,
        companyId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          vendorId: vendor.id,
          companyName: vendor.companyName,
          name: vendor.name ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("VENDOR CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create vendor" },
      { status: 500 },
    );
  }
}
