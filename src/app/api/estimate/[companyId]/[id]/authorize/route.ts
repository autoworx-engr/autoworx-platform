import {
  authorizeInvoice,
  deleteInvoiceAuthorize,
} from "@/actions/estimate/invoice/authorize";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/authorize:
 *   patch:
 *     summary: Authorize an estimate
 *     description: Authorizes an estimate by recording the authorized name, signature image URL, and converting it to an Invoice. Also decrements inventory quantities for associated products if converting from Estimate to Invoice.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authorizedName
 *               - url
 *               - invoiceType
 *             properties:
 *               authorizedName:
 *                 type: string
 *                 example: "John Doe"
 *                 description: Name of the person authorizing the estimate
 *               url:
 *                 type: string
 *                 example: "https://cdn.example.com/signatures/abc123.png"
 *                 description: URL of the uploaded signature image
 *               invoiceType:
 *                 type: string
 *                 enum: [Estimate, Invoice]
 *                 example: "Estimate"
 *                 description: Current type of the document before authorization
 *     responses:
 *       200:
 *         description: Estimate authorized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estimate authorized successfully
 *       400:
 *         description: Invalid company ID or missing required fields
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error (e.g. insufficient inventory)
 *
 *   delete:
 *     summary: Remove authorization from an estimate
 *     description: Clears the authorized name and signature image from an estimate, effectively revoking its authorization.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "clxyz123"
 *         description: Invoice/estimate ID (cuid)
 *     responses:
 *       200:
 *         description: Authorization removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Authorization removed successfully
 *       400:
 *         description: Invalid company ID
 *       401:
 *         description: Unauthorized – missing or invalid JWT
 *       403:
 *         description: Forbidden – companyId mismatch
 *       500:
 *         description: Internal server error
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { authorizedName, url, invoiceType } = body;

    if (!authorizedName || !url || !invoiceType) {
      return NextResponse.json(
        {
          success: false,
          message: "authorizedName, url, and invoiceType are required",
        },
        { status: 400 },
      );
    }

    const result = await authorizeInvoice(id, authorizedName, url, invoiceType);

    if (result?.type === "error") {
      return NextResponse.json(
        { success: false, message: (result as any).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estimate authorized successfully",
    });
  } catch (error: any) {
    console.error("ESTIMATE AUTHORIZE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to authorize estimate",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string; id: string }> },
) {
  try {
    const { companyId: companyIdParam, id } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await deleteInvoiceAuthorize(id);

    if (result?.type === "error") {
      return NextResponse.json(
        { success: false, message: (result as any).message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Authorization removed successfully",
    });
  } catch (error: any) {
    console.error("ESTIMATE AUTHORIZE DELETE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to remove authorization",
      },
      { status: 500 },
    );
  }
}
