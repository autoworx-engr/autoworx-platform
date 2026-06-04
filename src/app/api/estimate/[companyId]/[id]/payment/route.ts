import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CardType } from "@prisma/client";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/payment:
 *   post:
 *     summary: Record a payment for an invoice
 *     description: Creates a payment record (CASH, CARD, CHECK, OTHER, or DEPOSIT) for the given invoice and updates the invoice's due amount. Automatically converts Estimate → Invoice on payment.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, amount]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CASH, CARD, CHECK, OTHER, DEPOSIT]
 *               amount:
 *                 type: number
 *                 example: 150.00
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Payment date (defaults to now)
 *               notes:
 *                 type: string
 *               receivedCash:
 *                 type: string
 *                 description: For CASH — cash amount received from customer
 *               cardType:
 *                 type: string
 *                 description: For CARD — card brand (VISA, MASTERCARD, etc.)
 *               creditCard:
 *                 type: string
 *                 description: For CARD — last 4 digits or masked number
 *               checkNumber:
 *                 type: string
 *                 description: For CHECK
 *               paymentMethodId:
 *                 type: integer
 *                 description: For OTHER — ID of the custom payment method
 *               depositMethod:
 *                 type: string
 *                 description: For DEPOSIT
 *               depositNotes:
 *                 type: string
 *                 description: For DEPOSIT
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
export async function POST(
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
    const companyId = jwtCompanyId;

    const invoice = await db.invoice.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        due: true,
        deposit: true,
        totalPayment: true,
        clientId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const {
      type,
      amount,
      date,
      notes = "",
      receivedCash,
      cardType,
      creditCard,
      checkNumber,
      paymentMethodId,
      depositMethod,
      depositNotes,
    } = body;

    const VALID_TYPES = ["CASH", "CARD", "CHECK", "OTHER", "DEPOSIT"];
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: `type must be one of: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "amount must be a valid number greater than 0",
        },
        { status: 400 },
      );
    }

    const dueAfterPayment = Number(invoice.due ?? 0) - paymentAmount;
    const paymentDate = date ? new Date(date) : new Date();

    const payment = await db.$transaction(
      async (tx) => {
        let newPayment;

        switch (type) {
          case "CASH":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId: id,
                date: paymentDate,
                notes,
                amount: paymentAmount,
                dueAfterPayment,
                type: "CASH",
                cash: { create: { receivedCash: receivedCash ?? undefined } },
              },
              include: { cash: true },
            });
            break;

          case "CARD":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId: id,
                date: paymentDate,
                notes,
                amount: paymentAmount,
                dueAfterPayment,
                type: "CARD",
                card: {
                  create: {
                    cardType: (cardType as CardType) ?? "VISA",
                    creditCard: creditCard ?? undefined,
                  },
                },
              },
              include: { card: true },
            });
            break;

          case "CHECK":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId: id,
                date: paymentDate,
                notes,
                amount: paymentAmount,
                dueAfterPayment,
                type: "CHECK",
                check: { create: { checkNumber: checkNumber ?? undefined } },
              },
              include: { check: true },
            });
            break;

          case "OTHER":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId: id,
                date: paymentDate,
                notes,
                amount: paymentAmount,
                dueAfterPayment,
                type: "OTHER",
                other: {
                  create: {
                    paymentMethodId: paymentMethodId
                      ? Number(paymentMethodId)
                      : undefined,
                  },
                },
              },
              include: { other: { include: { paymentMethod: true } } },
            });
            break;

          case "DEPOSIT":
            newPayment = await tx.payment.create({
              data: {
                companyId,
                invoiceId: id,
                date: paymentDate,
                notes,
                amount: paymentAmount,
                dueAfterPayment,
                type: "DEPOSIT",
                deposit: {
                  create: {
                    depositMethod: depositMethod ?? undefined,
                    depositNotes: depositNotes ?? undefined,
                  },
                },
              },
            });
            // Deposit increments invoice.deposit, net totalPayment stays same
            await tx.invoice.update({
              where: { id },
              data: {
                deposit: { increment: paymentAmount },
                totalPayment: { decrement: paymentAmount },
              },
            });
            break;

          default:
            throw new Error("Invalid payment type");
        }

        // Common: reduce due, increment totalPayment, mark as Invoice
        await tx.invoice.update({
          where: { id },
          data: {
            type: "Invoice",
            due: { decrement: paymentAmount },
            totalPayment: { increment: paymentAmount },
          },
        });

        return newPayment;
      },
      { timeout: 15000, maxWait: 6000 },
    );

    return NextResponse.json(
      { success: true, message: "Payment created successfully", data: payment },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("PAYMENT CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to create payment" },
      { status: 500 },
    );
  }
}
