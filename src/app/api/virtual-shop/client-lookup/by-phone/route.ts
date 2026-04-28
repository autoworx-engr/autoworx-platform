import { db } from "@/lib/db";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");
    const shopId = searchParams.get("shopId");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!shopId) {
      return NextResponse.json(
        { error: "Shop ID is required" },
        { status: 400 },
      );
    }

    const shop = await db.shop.findUnique({
      where: { id: Number(shopId) },
      select: { companyId: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const normalizedPhone = normalizePhoneForStorage(phone);
    const phoneLookup = phoneLookupWhereClause(phone) ?? [];

    const fallbackLookup = [
      { mobile: phone },
      { mobile: normalizedPhone },
    ].filter((entry) => Boolean(entry.mobile));

    const client = await db.client.findFirst({
      where: {
        companyId: shop.companyId,
        OR: phoneLookup.length > 0 ? phoneLookup : fallbackLookup,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        Vehicle: {
          select: {
            id: true,
            year: true,
            make: true,
            model: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Error fetching client by phone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
