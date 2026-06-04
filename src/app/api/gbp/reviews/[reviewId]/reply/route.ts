import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getValidGbpToken, postGbpReply } from "@/lib/gbp";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId: reviewIdStr } = await props.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const companyId = session.user.companyId;
    const reviewId = Number(reviewIdStr);

    const review = await db.gbpReview.findFirst({
      where: { id: reviewId, location: { companyId } },
      include: { location: true },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, message: "Review not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const replyText: string = body.replyText?.trim();
    if (!replyText) {
      return NextResponse.json(
        { success: false, message: "Reply text is required" },
        { status: 400 },
      );
    }

    const accessToken = await getValidGbpToken(companyId);
    const locationName = `${review.location.googleAccountId}/locations/${review.location.googleLocationId}`;
    const reviewName = `${locationName}/reviews/${review.googleReviewId}`;

    await postGbpReply(accessToken, reviewName, replyText);

    const isUpdate = !!review.replyText;
    const updated = await db.gbpReview.update({
      where: { id: reviewId },
      data: { replyText, replyUpdatedAt: new Date(), syncStatus: "SYNCED" },
    });

    await db.gbpReviewActivityLog.create({
      data: {
        reviewId,
        actionType: isUpdate ? "REPLY_UPDATED" : "REPLY_CREATED",
        performedBy: Number(session.user.id),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    await db.gbpReview
      .update({
        where: { id: Number(reviewIdStr) },
        data: { syncStatus: "REPLY_FAILED" },
      })
      .catch(() => {});

    return NextResponse.json(
      { success: false, message: err.message ?? "Failed to post reply" },
      { status: 500 },
    );
  }
}
