import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { rate, message, companyId, sendUserId, sendCompanyId } = body;

    const existing = await db.reviews.findFirst({
      where: {
        companyId,
        sendCompanyId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "You already reviewed this company" },
        { status: 400 },
      );
    }

    const review = await db.reviews.create({
      data: {
        rate,
        message,
        companyId,
        sendUserId,
        sendCompanyId,
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to create review" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = Number(searchParams.get("companyId"));

    const reviews = await db.reviews.findMany({
      where: {
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
