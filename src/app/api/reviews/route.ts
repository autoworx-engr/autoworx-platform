import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a company review
 *     description: Allows a company to submit a review for another company. A company can only review another company once.
 *     tags:
 *       - Reviews
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rate
 *               - companyId
 *               - sendUserId
 *               - sendCompanyId
 *             properties:
 *               rate:
 *                 type: number
 *                 example: 4.5
 *                 description: Rating value for the company
 *               message:
 *                 type: string
 *                 example: Great collaboration and fast response.
 *                 description: Review message
 *               companyId:
 *                 type: integer
 *                 example: 5
 *                 description: Company being reviewed
 *               sendUserId:
 *                 type: integer
 *                 example: 12
 *                 description: User ID submitting the review
 *               sendCompanyId:
 *                 type: integer
 *                 example: 2
 *                 description: Company ID of the reviewer
 *     responses:
 *       200:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     rate:
 *                       type: number
 *                       example: 4.5
 *                     message:
 *                       type: string
 *                       example: Great collaboration and fast response.
 *                     companyId:
 *                       type: integer
 *                       example: 5
 *                     sendUserId:
 *                       type: integer
 *                       example: 12
 *                     sendCompanyId:
 *                       type: integer
 *                       example: 2
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Company already reviewed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: You already reviewed this company
 *       500:
 *         description: Failed to create review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to create review
 *
 *   get:
 *     summary: Get company reviews
 *     description: Fetch all reviews for a specific company and highlight the current company's review if available.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 5
 *         description: Company ID to fetch reviews for
 *       - in: query
 *         name: currentCompanyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *         description: Current company ID to determine if it already reviewed
 *     responses:
 *       200:
 *         description: Company reviews fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           rate:
 *                             type: number
 *                             example: 4.5
 *                           message:
 *                             type: string
 *                           companyId:
 *                             type: integer
 *                           sendCompanyId:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               image:
 *                                 type: string
 *                     userReview:
 *                       type: object
 *                       nullable: true
 *                       description: Review submitted by the current company if exists
 *                     alreadyReviewed:
 *                       type: boolean
 *                       example: true
 *       500:
 *         description: Failed to fetch reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to fetch reviews
 */

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
    const currentCompanyId = Number(searchParams.get("currentCompanyId"));

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

    const userReview = reviews.find(
      (r) => r.sendCompanyId === currentCompanyId,
    );

    const alreadyReviewed = !!userReview;

    let sortedReviews = reviews;

    if (userReview) {
      const otherReviews = reviews.filter((r) => r.id !== userReview.id);

      sortedReviews = [userReview, ...otherReviews];
    }

    return NextResponse.json({
      success: true,
      data: {
        reviews: sortedReviews,
        userReview: userReview || null,
        alreadyReviewed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
