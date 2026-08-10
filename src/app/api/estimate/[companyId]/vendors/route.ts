import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWordSearchAnd } from "@/lib/wordSearch";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { createVendorValidationSchema } from "@/validations/schemas/vendor/vendor.validation";

/**
 * @swagger
 * /api/estimate/{companyId}/vendors:
 *   get:
 *     summary: Get vendors for a company
 *     description: Returns vendors belonging to the given company, with pagination and search. Used to populate the vendor selector when creating or editing an estimate.
 *     tags:
 *       - Vendors
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *           example: "John"
 *         description: Filter vendors by name, company name, email or phone
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Records per page (default 50)
 *     responses:
 *       200:
 *         description: Vendors fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       website:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       countryCode:
 *                         type: string
 *                       address:
 *                         type: string
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 *                       zip:
 *                         type: string
 *                       companyName:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       companyId:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - company ID mismatch
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("searchTerm") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { companyId };

    const searchAnd = buildWordSearchAnd(searchTerm, [
      "name",
      "companyName",
      "email",
      "phone",
    ]);
    if (searchAnd) {
      where.AND = searchAnd;
    }

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(searchTerm ? {} : { skip, take: limit }),
      }),
      db.vendor.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: vendors,
      pagination: searchTerm
        ? {
            page: 1,
            limit: total,
            total,
            totalPages: 1,
            hasMore: false,
          }
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + vendors.length < total,
          },
    });
  } catch (error) {
    console.error("ESTIMATE VENDORS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch vendors" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/estimate/{companyId}/vendors:
 *   post:
 *     summary: Create a vendor
 *     description: Creates a vendor for the given company. Used when adding a new supplier/vendor from the estimate flow.
 *     tags:
 *       - Vendors
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               companyName:
 *                 type: string
 *                 example: "Acme Auto Parts"
 *               email:
 *                 type: string
 *                 example: "vendor@acme.com"
 *               phone:
 *                 type: string
 *                 example: "5551234567"
 *               countryCode:
 *                 type: string
 *                 example: "US"
 *               website:
 *                 type: string
 *                 example: "https://acme.com"
 *               address:
 *                 type: string
 *                 example: "123 Main St"
 *               city:
 *                 type: string
 *                 example: "Springfield"
 *               state:
 *                 type: string
 *                 example: "IL"
 *               zip:
 *                 type: string
 *                 example: "62704"
 *               notes:
 *                 type: string
 *                 example: "Preferred vendor for brake parts"
 *     responses:
 *       201:
 *         description: Vendor created successfully
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
 *       400:
 *         description: Validation error (e.g. companyName is required)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - company ID mismatch
 *       500:
 *         description: Internal server error
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const body = await req.json();
    const {
      name,
      website,
      email,
      phone,
      countryCode,
      address,
      city,
      state,
      zip,
      companyName,
      notes,
    } = body ?? {};

    const validatedVendorData = await createVendorValidationSchema.parseAsync({
      name,
      website,
      email,
      phone,
      address,
      city,
      state,
      zip,
      companyName,
      notes,
    });

    const vendor = await db.vendor.create({
      data: {
        name: validatedVendorData.name,
        website: validatedVendorData.website,
        email: validatedVendorData.email,
        phone: validatedVendorData.phone,
        countryCode,
        address: validatedVendorData.address,
        city: validatedVendorData.city,
        state: validatedVendorData.state,
        zip: validatedVendorData.zip,
        companyName: validatedVendorData.companyName,
        notes: validatedVendorData.notes,
        companyId,
      },
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error: any) {
    console.error("ESTIMATE VENDORS POST ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: normalized.message || "Failed to create vendor",
        path: normalized.errorSource?.[0]?.path ?? "",
      },
      { status: normalized.statusCode || 500 },
    );
  }
}
