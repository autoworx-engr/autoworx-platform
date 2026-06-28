import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { newPayment } from "@/actions/payment/newPayment";
import { db } from "@/lib/db";
import { PaymentType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/payment:
 *   post:
 *     summary: Create a new payment for an invoice
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId, type, date, notes, amount, additionalData]
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: "clxyz123abc"
 *               type:
 *                 type: string
 *                 enum: [CARD, CHECK, CASH, OTHER, DEPOSIT]
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-07"
 *               notes:
 *                 type: string
 *                 example: "Paid in full"
 *               amount:
 *                 type: number
 *                 example: 250.00
 *               additionalData:
 *                 type: object
 *                 description: >
 *                   CARD: { creditCard, cardType: MASTERCARD|VISA|AMEX|OTHER }
 *                   CHECK: { checkNumber }
 *                   CASH: { receivedCash }
 *                   OTHER: { paymentMethodId }
 *                   DEPOSIT: { depositMethod, depositNotes }
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       400:
 *         description: Validation error or invoice not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { invoiceId, type, date, notes, amount, additionalData } = body;

    if (!invoiceId || !type || !date || amount === undefined) {
      return NextResponse.json(
        { error: "invoiceId, type, date and amount are required" },
        { status: 400 },
      );
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId, companyId: principal.companyId },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const mergedAdditionalData = {
      creditCard: additionalData?.creditCard || "",
      cardType: additionalData?.cardType || "MASTERCARD",
      checkNumber: additionalData?.checkNumber || "",
      receivedCash: additionalData?.receivedCash || "",
      paymentMethodId: additionalData?.paymentMethodId,
      depositMethod: additionalData?.depositMethod || "",
      depositNotes: additionalData?.depositNotes,
    };

    const result = await newPayment({
      companyId: principal.companyId,
      invoiceId,
      type: type as PaymentType,
      date: new Date(date),
      notes: notes || "",
      amount: Number(amount),
      additionalData: mergedAdditionalData,
    });

    if (result.type !== "success") {
      return NextResponse.json(
        {
          error:
            (result as any)?.errorSource?.[0]?.message ||
            (result as any)?.message ||
            "Failed to create payment",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: 201,
        message: "Payment created successfully",
        data: result.data,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
