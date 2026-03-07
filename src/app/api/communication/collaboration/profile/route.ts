import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/communication/collaboration/profile/:
 *   get:
 *     summary: Get company profile details
 *     description: Fetch company profile with review statistics
 *     tags:
 *       - Company
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: currentCompanyId
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Company details fetched successfully
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = Number(searchParams.get("companyId"));
    const userId = Number(searchParams.get("userId"));
    const currentCompanyId = Number(searchParams.get("currentCompanyId"));

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        image: true,
        about: true,
        teamSize: true,
        industry: true,
        address: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    const reviews = await prisma.reviews.findMany({
      where: { companyId },
      select: {
        id: true,
        rate: true,
        message: true,
        sendUserId: true,
      },
    });

    const totalReviews = reviews.length;

    const avgRate =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rate, 0) / totalReviews
        : 0;

    const userReview = reviews.find((r) => r.sendUserId === userId);

    const alreadyReviewed = !!userReview;

    const response = {
      id: company.id,
      name: company.name,
      image: company.image,
      about: company.about,
      teamSize: company.teamSize,
      industry: company.industry,
      address: company.address,

      avgRate: Number(avgRate.toFixed(1)),
      totalReviews,

      userReview: userReview || null,
      alreadyReviewed,

      totalCollaboration: 12, // static
      totalJobsDone: 45, // static
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
