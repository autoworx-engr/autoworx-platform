import {
  getInvoiceTags,
  saveInvoiceTag,
  removeInvoiceTag,
} from "@/actions/pipelines/invoiceTag";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/pipeline/shop/invoice-tags:
 *   get:
 *     summary: Get all available invoice tags for the company
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice tags retrieved successfully
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
 *                   example: Invoice tags retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       tag:
 *                         type: string
 *                         example: VIP
 *                       type:
 *                         type: string
 *                         example: GENERAL
 *                       companyId:
 *                         type: number
 *                         example: 1
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Add a tag to an invoice
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *               - tagId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *               tagId:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Tag added to invoice successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Remove a tag from an invoice
 *     tags: [Shop Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceId
 *               - tagId
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123"
 *               tagId:
 *                 type: number
 *                 example: 1
 *     responses:
 *       200:
 *         description: Tag removed from invoice successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const result = await getInvoiceTags(principal.companyId);

    if (result.type === "error") {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to fetch invoice tags",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invoice tags retrieved successfully",
      data: result.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to retrieve invoice tags",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const { invoiceId, tagId } = body;

    if (!invoiceId || !tagId) {
      return NextResponse.json(
        { success: false, message: "invoiceId and tagId are required" },
        { status: 400 },
      );
    }

    const data = await saveInvoiceTag(invoiceId, tagId);

    return NextResponse.json({
      success: true,
      message: "Tag added to invoice successfully",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to add tag to invoice",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const body = await req.json();
    const { invoiceId, tagId } = body;

    if (!invoiceId || !tagId) {
      return NextResponse.json(
        { success: false, message: "invoiceId and tagId are required" },
        { status: 400 },
      );
    }

    await removeInvoiceTag(invoiceId, tagId);

    return NextResponse.json({
      success: true,
      message: "Tag removed from invoice successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to remove tag from invoice",
      },
      { status: 500 },
    );
  }
}
