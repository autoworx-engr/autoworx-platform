import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import {
  fetchGbpReviews,
  getValidGbpToken,
  starRatingToNumber,
} from "@/lib/gbp";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    const { searchParams } = req.nextUrl;

    const rating = searchParams.get("rating");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") ?? "newest";
    const locationId = searchParams.get("locationId");

    const where: any = { location: { companyId, isActive: true } };
    if (locationId) where.locationId = Number(locationId);
    if (rating) where.rating = Number(rating);
    if (status === "replied") where.replyText = { not: null };
    if (status === "unreplied") where.replyText = null;
    if (search) where.authorName = { contains: search, mode: "insensitive" };

    const reviews = await db.gbpReview.findMany({
      where,
      include: { location: { select: { id: true, name: true } } },
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    });

    const total = reviews.length;
    const replied = reviews.filter((r) => r.replyText).length;
    const avgRating =
      total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        stats: { total, replied, unreplied: total - replied, avgRating },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

// POST: sync all reviews from Google for this company
export async function POST() {
  try {
    const companyId = await getCompanyId();
    const locations = await db.gbpLocation.findMany({
      where: { companyId, isActive: true },
    });

    if (!locations.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No locations found. Sync locations first.",
        },
        { status: 400 },
      );
    }

    const accessToken = await getValidGbpToken(companyId);
    let synced = 0;

    for (const loc of locations) {
      const locationName = `${loc.googleAccountId}/locations/${loc.googleLocationId}`;
      let pageToken: string | undefined;

      do {
        const data = await fetchGbpReviews(
          accessToken,
          locationName,
          pageToken,
        );
        const reviews: any[] = data.reviews ?? [];
        pageToken = data.nextPageToken;

        for (const r of reviews) {
          const googleReviewId: string = r.reviewId;
          await db.gbpReview.upsert({
            where: {
              locationId_googleReviewId: { locationId: loc.id, googleReviewId },
            },
            create: {
              locationId: loc.id,
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
              authorName: r.reviewer?.displayName ?? "Anonymous",
              rating: starRatingToNumber(r.starRating),
              comment: r.comment ?? null,
              replyText: r.reviewReply?.comment ?? null,
              replyUpdatedAt: r.reviewReply?.updateTime
                ? new Date(r.reviewReply.updateTime)
                : null,
            },
          });
          synced++;
        }
      } while (pageToken);
    }

    return NextResponse.json({ success: true, data: { synced } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}
