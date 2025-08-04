"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { PaymentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface RefundPaymentParams {
  paymentId: number;
  refundAmount: number;
  refundMethod: PaymentType;
  refundReason?: string;
  refundDate?: Date;
}

/**
 * New refund system that creates separate refund records instead of modifying original payments
 * This maintains payment history integrity and provides proper audit trails
 */
export async function refundPaymentV2({
  paymentId,
  refundAmount,
  refundMethod,
  refundReason,
  refundDate,
}: RefundPaymentParams) {
  try {
    const companyId = await getCompanyId();

    // Get the payment with all related data
    const payment = await db.payment.findUnique({
      where: { id: paymentId, companyId },
      include: {
        Refund: true, // Include existing refunds
      },
    });

    if (!payment) {
      return {
        type: "globalError" as const,
        message: "Payment not found",
        errorSource: [],
      };
    }

    const originalAmount = Number(payment.amount) || 0;

    // For validation, check if the new refund amount exceeds the original payment
    if (refundAmount > originalAmount) {
      return {
        type: "globalError" as const,
        message: `Refund amount cannot exceed original payment amount. Maximum: $${originalAmount.toFixed(2)}`,
        errorSource: [],
      };
    }

    if (refundAmount <= 0) {
      return {
        type: "globalError" as const,
        message: "Refund amount must be greater than 0",
        errorSource: [],
      };
    } // Start transaction - create or update refund record (only one refund per payment)
    await db.$transaction(async (tx) => {
      // Check if a refund record already exists for this payment
      const existingRefund = await tx.refund.findFirst({
        where: { paymentId: paymentId },
      });

      if (existingRefund) {
        // Update existing refund record
        await tx.refund.update({
          where: { id: existingRefund.id },
          data: {
            amount: refundAmount,
            reason: refundReason,
            method: refundMethod,
            refundDate: refundDate || new Date(),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new refund record
        await tx.refund.create({
          data: {
            amount: refundAmount,
            reason: refundReason,
            method: refundMethod,
            refundDate: refundDate || new Date(),
            paymentId: paymentId,
            invoiceId: payment.invoiceId!,
            companyId: companyId,
            // processedBy can be added when we have user context
          },
        });
      }

      // Update payment's refunded amount for quick access (but don't modify original amount)
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: refundAmount, // Set to the current refund amount (not accumulated)
          refundMethod: refundMethod,
          refundReason: refundReason,
          refundCreatedAt: refundDate || new Date(),
          refundUpdatedAt: new Date(),
        },
      });
    });

    revalidatePath("/dashboard/estimate/edit");
    revalidatePath("/dashboard/payments");
    return {
      type: "success" as const,
      message: "Refund processed successfully",
    };
  } catch (error) {
    console.error("Error processing refund:", error);
    return {
      type: "globalError" as const,
      message: "Failed to process refund",
      errorSource: [],
    };
  }
}

/**
 * Delete refund - removes all refund records for a payment and resets payment state
 */
export async function deleteRefundV2({ paymentId }: { paymentId: number }) {
  try {
    const companyId = await getCompanyId();

    const payment = await db.payment.findUnique({
      where: { id: paymentId, companyId },
    });

    if (!payment) {
      return {
        type: "globalError" as const,
        message: "Payment not found",
        errorSource: [],
      };
    }

    await db.$transaction(async (tx) => {
      // Delete all refund records for this payment
      await tx.refund.deleteMany({
        where: { paymentId },
      });

      // Reset payment refund fields to restore original payment state
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: 0,
          refundMethod: null,
          refundReason: null,
          refundCreatedAt: null,
          refundUpdatedAt: null,
        },
      });
    });

    revalidatePath("/dashboard/estimate/edit");
    revalidatePath("/dashboard/payments");
    return {
      type: "success" as const,
      message: "Refund deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting refund:", error);
    return {
      type: "globalError" as const,
      message: "Failed to delete refund",
      errorSource: [],
    };
  }
}

/**
 * Get payment summary with proper refund calculations
 */
export async function getPaymentSummary(invoiceIds: string[]) {
  const companyId = await getCompanyId();

  const payments = await db.payment.findMany({
    where: {
      invoiceId: { in: invoiceIds },
      companyId,
    },
    select: {
      id: true,
      amount: true,
      refundedAmount: true,
      type: true,
      createdAt: true,
      invoiceId: true,
      notes: true,
      card: {
        select: {
          cardType: true,
        },
      },
      cash: {
        select: {
          receivedCash: true,
        },
      },
      other: {
        select: {
          paymentMethod: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return payments.map((payment) => ({
    ...payment,
    originalAmount: Number(payment.amount) || 0,
    refundedAmount: Number(payment.refundedAmount) || 0,
    netAmount:
      (Number(payment.amount) || 0) - (Number(payment.refundedAmount) || 0),
    paymentMethod:
      payment.type === "CARD"
        ? payment.card?.cardType || "CARD"
        : payment.type === "CASH"
          ? "CASH"
          : payment.type === "OTHER"
            ? payment.other?.paymentMethod?.name || "OTHER"
            : payment.type,
  }));
}
