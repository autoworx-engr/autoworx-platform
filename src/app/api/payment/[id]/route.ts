import { updatePayment } from "@/actions/payment/updatePayment";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { PaymentType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * @swagger
 * /api/payment/{id}:
 *   get:
 *     summary: Get a single payment with all related details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 42
 *     responses:
 *       200:
 *         description: Payment details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id, companyId: principal.companyId },
    include: {
      card: true,
      check: true,
      cash: true,
      other: { include: { paymentMethod: true } },
      deposit: true,
      Refund: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({ status: 200, data: payment });
}

/**
 * @swagger
 * /api/payment/{id}:
 *   patch:
 *     summary: Update an existing payment
 *     description: >
 *       Updates payment details and recalculates invoice totals and
 *       dueAfterPayment for all related payments. Changing payment type
 *       (e.g. DEPOSIT ↔ regular) is supported and adjusts invoice fields
 *       accordingly. Amount cannot be reduced below total refunded amount.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 42
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, date, notes, amount, additionalData]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CARD, CHECK, CASH, OTHER, DEPOSIT]
 *                 example: CARD
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-07"
 *               notes:
 *                 type: string
 *                 example: "Updated payment"
 *               amount:
 *                 type: number
 *                 example: 300.00
 *               additionalData:
 *                 type: object
 *                 description: >
 *                   CARD: { creditCard, cardType: MASTERCARD|VISA|AMEX|OTHER }
 *                   CHECK: { checkNumber }
 *                   CASH: { receivedCash }
 *                   OTHER: { paymentMethodId }
 *                   DEPOSIT: { depositMethod, depositNotes }
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *       400:
 *         description: Validation error or amount below refunded amount
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const owned = await db.payment.findUnique({
    where: { id, companyId: principal.companyId },
    select: { id: true },
  });

  if (!owned) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { type, date, notes, amount, additionalData } = body;

    if (!type || !date || amount === undefined) {
      return NextResponse.json(
        { error: "type, date and amount are required" },
        { status: 400 },
      );
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

    const result = await updatePayment({
      id,
      type: type as PaymentType,
      date: new Date(date),
      notes: notes || "",
      amount: Number(amount),
      additionalData: mergedAdditionalData,
    });

    if (result.type !== "success") {
      return NextResponse.json(
        { error: (result as any)?.message || "Failed to update payment" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      status: 200,
      message: "Payment updated successfully",
      data: result.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/payment/{id}:
 *   delete:
 *     summary: Delete a payment and reverse its effect on the invoice
 *     description: >
 *       Hard-deletes the payment record and restores the invoice's due/totalPayment/deposit.
 *       Recalculates dueAfterPayment for all remaining payments on the same invoice.
 *       Returns 400 if the payment has any refunds attached.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 42
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *       400:
 *         description: Cannot delete — payment has refunds
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id, companyId: principal.companyId },
    include: { Refund: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.Refund.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a payment that has refunds" },
      { status: 400 },
    );
  }

  try {
    const amount = Number(payment.amount);
    const isDeposit = payment.type === "DEPOSIT";

    await db.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: payment.invoiceId!, companyId: principal.companyId },
        data: {
          due: { increment: amount },
          ...(isDeposit
            ? { deposit: { decrement: amount } }
            : { totalPayment: { decrement: amount } }),
        },
      });

      const invoice = await tx.invoice.findUnique({
        where: { id: payment.invoiceId! },
        select: { grandTotal: true },
      });

      const remaining = await tx.payment.findMany({
        where: {
          invoiceId: payment.invoiceId!,
          id: { not: id },
          companyId: principal.companyId,
        },
        orderBy: { createdAt: "asc" },
      });

      let cumulative = 0;
      for (const p of remaining) {
        cumulative += Number(p.amount);
        await tx.payment.update({
          where: { id: p.id },
          data: {
            dueAfterPayment: Number(invoice?.grandTotal || 0) - cumulative,
          },
        });
      }

      await tx.payment.delete({ where: { id } });
    });

    return NextResponse.json({
      status: 200,
      message: "Payment deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
