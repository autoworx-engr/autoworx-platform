import { getUserPermissions } from "@/actions/settings/teamManagement";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/communication/collaboration/profile:
 *   get:
 *     summary: Get company collaboration profile
 *     description: Returns company profile information, review rating, and completed jobs.
 *     tags:
 *       - Collaboration
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         description: ID of the company
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: Company profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 12
 *                 name:
 *                   type: string
 *                   example: ABC Construction
 *                 image:
 *                   type: string
 *                   example: https://cdn.domain.com/company/logo.png
 *                 about:
 *                   type: string
 *                   example: We specialize in residential and commercial construction.
 *                 teamSize:
 *                   type: integer
 *                   example: 25
 *                 industry:
 *                   type: string
 *                   example: Construction
 *                 address:
 *                   type: string
 *                   example: New York
 *                 avgRate:
 *                   type: number
 *                   example: 4.5
 *                 totalReviews:
 *                   type: integer
 *                   example: 38
 *                 totalCollaboration:
 *                   type: integer
 *                   example: 7
 *                 totalJobsDone:
 *                   type: integer
 *                   example: 124
 *       400:
 *         description: Missing companyId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: companyId is required
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Company not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Something went wrong
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = Number(searchParams.get("companyId"));

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 },
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        image: true,
        about: true,
        teamSize: true,
        industry: true,
        city: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 },
      );
    }

    const reviews = await db.reviews.findMany({
      where: { companyId },
      select: {
        id: true,
        rate: true,
        message: true,
        sendUserId: true,
        sendCompanyId: true,
      },
    });

    const totalReviews = reviews.length;

    const avgRate =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rate, 0) / totalReviews
        : 0;

    const connectedCompanies = await db.companyJoin.findMany({
      where: {
        OR: [
          {
            companyOneId: companyId,
            companyTwo: {
              isCollaborators: true,
            },
          },
          {
            companyTwoId: companyId,
            companyOne: {
              isCollaborators: true,
            },
          },
        ],
        status: "ACCEPTED",
      },
      include: {
        companyOne: {
          include: {
            users: {
              where: {
                employeeType: {
                  in: ["Admin", "Manager", "Sales"],
                },
              },
            },
          },
        },
        companyTwo: {
          include: {
            users: {
              where: {
                employeeType: {
                  in: ["Admin", "Manager", "Sales"],
                },
              },
            },
          },
        },
      },
    });

    const oppositeCompanies = connectedCompanies.map((join) => {
      if (join.companyOneId === companyId) {
        return join.companyTwo;
      } else {
        return join.companyOne;
      }
    });
    // Filter users in oppositeCompanies based on their collaboration permissions
    const filteredOppositeCompanies = await Promise.all(
      oppositeCompanies.map(async (company) => {
        // Filter users who have collaboration permission
        const filteredUsers = await Promise.all(
          company.users.map(async (user) => {
            try {
              const permissions = await getUserPermissions(
                user.id,
                user.employeeType,
              );

              // Check communicationHubCollaboration permission
              const hasCollaboration =
                permissions?.communicationHubCollaboration === true;

              return hasCollaboration ? user : null;
            } catch (error) {
              console.error(`  ERROR for user ${user.firstName}:`, error);
              return null;
            }
          }),
        );

        const filtered = filteredUsers.filter((user) => user !== null);

        return {
          ...company,
          users: filtered,
        };
      }),
    );

    // Remove companies that have no users with collaboration permission
    const finalCompanies = filteredOppositeCompanies.filter(
      (company) => company.users.length > 0,
    );

    // completed jobs
    const completedJobs = await db.technician.count({
      where: {
        companyId,
        status: "Complete",
      },
    });

    const response = {
      id: company.id,
      name: company.name,
      image: company.image,
      about: company.about,
      teamSize: company.teamSize,
      industry: company.industry,
      address: company.city,
      avgRate: Number(avgRate.toFixed(1)),
      totalReviews,
      totalCollaboration: finalCompanies?.length,
      totalJobsDone: completedJobs,
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
