import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      storeName,
      description,
      logoUrl,
      bannerUrl,
      themeConfig,
      companyId,
    } = body;

    const slug = storeName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!storeName || !slug) {
      return NextResponse.json(
        { success: false, message: "storeName and slug are required" },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existing = await db.shop.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Slug already exists" },
        { status: 400 },
      );
    }

    const shop = await db.shop.create({
      data: {
        companyId,
        storeName,
        slug,
        description: description ?? null,
        logoUrl,
        bannerUrl,
        themeConfig: themeConfig ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shop created successfully",
      data: shop,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
