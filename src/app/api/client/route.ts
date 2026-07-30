import { addCustomer } from "@/actions/client/add";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Create a new client
 *     description: Creates a new client (customer) for a company. Rejects the request if a client with the same email or mobile number already exists for the company.
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 nullable: true
 *                 example: Doe
 *               mobile:
 *                 type: string
 *                 nullable: true
 *                 example: "5551234567"
 *               countryCode:
 *                 type: string
 *                 nullable: true
 *                 example: US
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: john.doe@example.com
 *               address:
 *                 type: string
 *                 nullable: true
 *                 example: 123 Main St
 *               city:
 *                 type: string
 *                 nullable: true
 *                 example: Springfield
 *               state:
 *                 type: string
 *                 nullable: true
 *                 example: IL
 *               zip:
 *                 type: string
 *                 nullable: true
 *                 example: "62704"
 *               customerCompany:
 *                 type: string
 *                 nullable: true
 *                 example: Acme Inc.
 *               sourceId:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               tagId:
 *                 type: integer
 *                 nullable: true
 *                 example: 4
 *               photo:
 *                 type: string
 *                 nullable: true
 *                 example: /images/default.png
 *     responses:
 *       200:
 *         description: Client created successfully
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
 *                       example: 15
 *                     firstName:
 *                       type: string
 *                       example: John
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                       example: Doe
 *                     mobile:
 *                       type: string
 *                       nullable: true
 *                       example: "5551234567"
 *                     countryCode:
 *                       type: string
 *                       nullable: true
 *                       example: US
 *                     email:
 *                       type: string
 *                       nullable: true
 *                       example: john.doe@example.com
 *                     address:
 *                       type: string
 *                       nullable: true
 *                       example: 123 Main St
 *                     city:
 *                       type: string
 *                       nullable: true
 *                       example: Springfield
 *                     state:
 *                       type: string
 *                       nullable: true
 *                       example: IL
 *                     zip:
 *                       type: string
 *                       nullable: true
 *                       example: "62704"
 *                     isFleet:
 *                       type: boolean
 *                       nullable: true
 *                       example: false
 *                     photo:
 *                       type: string
 *                       example: /images/default.png
 *                     sourceId:
 *                       type: integer
 *                       nullable: true
 *                       example: 2
 *                     converted:
 *                       type: boolean
 *                       nullable: true
 *                       example: false
 *                     companyId:
 *                       type: integer
 *                       example: 1
 *                     customerCompany:
 *                       type: string
 *                       nullable: true
 *                       example: Acme Inc.
 *                     tagId:
 *                       type: integer
 *                       nullable: true
 *                       example: 4
 *                     notes:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     leadId:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     isStarred:
 *                       type: boolean
 *                       nullable: true
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required field (firstName)
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
 *                   example: firstName is required
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Unauthorized
 *       409:
 *         description: A client with the same email or mobile number already exists
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
 *                   example: A customer with this email already exists.
 *       500:
 *         description: Failed to create client
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
 *                   example: Failed to create client
 */
export async function POST(req: NextRequest) {
  try {
    const companyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      mobile,
      countryCode,
      email,
      address,
      city,
      state,
      zip,
      customerCompany,
      sourceId,
      tagId,
      photo,
    } = body;

    if (!firstName?.trim()) {
      return NextResponse.json(
        { success: false, message: "firstName is required" },
        { status: 400 },
      );
    }

    const result = await addCustomer({
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      mobile,
      countryCode,
      email: email?.trim() || undefined,
      address: address?.trim() || undefined,
      city: city?.trim() || undefined,
      state: state?.trim() || undefined,
      zip: zip?.trim() || undefined,
      customerCompany: customerCompany?.trim() || undefined,
      sourceId: typeof sourceId === "number" ? sourceId : undefined,
      tagId: typeof tagId === "number" ? tagId : undefined,
      photo: photo?.trim() || undefined,
      forceCompanyId: companyId,
    });

    if (result?.type === "globalError" || result?.type === "error") {
      return NextResponse.json(
        { success: false, message: (result as { message: string }).message },
        { status: 409 },
      );
    }

    const created = (result as { type: "success"; data: unknown }).data;
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create client" },
      { status: 500 },
    );
  }
}
