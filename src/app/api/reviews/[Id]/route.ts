import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const { rate, message } = body;

    const review = await db.reviews.update({
      where: { id },
      data: {
        rate,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update review" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);

    await db.reviews.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete review" },
      { status: 500 },
    );
  }
}
