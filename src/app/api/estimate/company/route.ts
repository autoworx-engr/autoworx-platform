import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { fetchAndTransformData } from "@/lib/fetchAndTransformData";
import { InvoiceType } from "@prisma/client";

/**
 * @swagger
 * /api/estimate/company:
 *   get:
 *     summary: Fetch estimate/invoices with filters
 *     description: Returns paginated invoice data with filtering options
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Estimate, Invoice]
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           example: "2025-01-31"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: take
 *         schema:
 *           type: integer
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           example: "Asia/Dhaka"
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 */

export async function GET(req: NextRequest) {
  try {
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as InvoiceType;
    const timezone = searchParams.get("timezone") || "UTC";
    const companyId = jwtCompanyId;

    if (!type) {
      return NextResponse.json(
        { error: "Missing required params: type" },
        { status: 400 },
      );
    }

    const data = await fetchAndTransformData(
      type,
      companyId,
      {
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        status: searchParams.get("status") || undefined,
        page: searchParams.get("page") || undefined,
        searchTerm: searchParams.get("searchTerm") || undefined,
        take: searchParams.get("take") || undefined,
      },
      timezone,
    );

    return NextResponse.json({
      status: 200,
      message: "The invoices/estimates fetched successfully!",
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
