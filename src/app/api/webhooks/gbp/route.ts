import { db } from "@/lib/db";
import { starRatingToNumber } from "@/lib/gbp";
import { NextRequest, NextResponse } from "next/server";

// Google Business Profile push notification webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Google sends the resource name of the changed review
    const reviewName: string = body?.name;
    if (!reviewName) return NextResponse.json({ ok: true });

    // name format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    const parts = reviewName.split("/");
    if (parts.length < 6) return NextResponse.json({ ok: true });

    const googleAccountPart = `accounts/${parts[1]}`;
    const googleLocationId = parts[3];
    const googleReviewId = parts[5];

    const location = await db.gbpLocation.findFirst({
      where: {
        googleAccountId: googleAccountPart,
        googleLocationId,
        isActive: true,
      },
      include: {
        company: { select: { id: true, gbpAccessToken: true } },
      },
    });

    if (!location?.company.gbpAccessToken)
      return NextResponse.json({ ok: true });

    const accessToken = location.company.gbpAccessToken;

    // Fetch the current state of the review from Google
    const reviewRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewName}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!reviewRes.ok) return NextResponse.json({ ok: true });
    const r = await reviewRes.json();

    const upserted = await db.gbpReview.upsert({
      where: {
        locationId_googleReviewId: { locationId: location.id, googleReviewId },
      },
      create: {
        locationId: location.id,
        googleReviewId,
        authorName: r.reviewer?.displayName ?? "Anonymous",
        authorPhotoUrl: r.reviewer?.profilePhotoUrl ?? null,
        rating: starRatingToNumber(r.starRating),
        comment: r.comment ?? null,
        replyText: r.reviewReply?.comment ?? null,
        replyUpdatedAt: r.reviewReply?.updateTime
          ? new Date(r.reviewReply.updateTime)
          : null,
        createdAt: new Date(r.createTime),
      },
      update: {
        rating: starRatingToNumber(r.starRating),
        comment: r.comment ?? null,
        replyText: r.reviewReply?.comment ?? null,
        replyUpdatedAt: r.reviewReply?.updateTime
          ? new Date(r.reviewReply.updateTime)
          : null,
      },
    });

    await db.gbpReviewActivityLog.create({
      data: { reviewId: upserted.id, actionType: "WEBHOOK_RECEIVED" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhooks/gbp]", err);
    return NextResponse.json({ ok: true }); // always 200 to stop retries
  }
}
