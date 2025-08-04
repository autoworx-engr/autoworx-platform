"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { PaymentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Existing refundPayment function
interface RefundPaymentParams {
  paymentId: number;
  refundAmount: number;
  refundMethod: PaymentType;
  refundReason?: string;
  refundDate?: Date;
}

export async function refundPayment({
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
        card: true,
        cash: true,
        check: true,
        other: true,
        deposit: true,
      },
    });

    if (!payment) {
      return {
        type: "globalError" as const,
        message: "Payment not found",
        errorSource: [],
      };
    }

    const currentRefunded = Number(payment.refundedAmount) || 0;
    const originalAmount = Number(payment.amount) + currentRefunded; // Get original amount before any refunds

    if (refundAmount > originalAmount) {
      return {
        type: "globalError" as const,
        message: "Refund amount cannot exceed original payment amount",
        errorSource: [],
      };
    }

    const newAmount = originalAmount - refundAmount; // Calculate new amount after refund

    // Start transaction
    await db.$transaction(async (tx) => {
      // Update payment with refund information
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amount: newAmount, // Update the amount by deducting refund
          refundedAmount: refundAmount, // Set the total refunded amount
          refundMethod,
          refundReason: refundReason || null, // Optional field
          refundCreatedAt: refundDate || new Date(), // Use the provided date or current date
          refundUpdatedAt: new Date(), // Always update this to current time
        },
      });

      // Update related payment method tables
      if (payment.type === "CASH" && payment.cash) {
        const originalCash =
          Number(payment.cash.receivedCash) + currentRefunded; // Get original cash amount

        // Check if the original cash amount is equal or bigger than refund amount
        if (originalCash >= refundAmount) {
          const remainingCash = originalCash - refundAmount;
          await tx.cashPayment.update({
            where: { id: payment.cash.id },
            data: {
              receivedCash: remainingCash.toString(),
            },
          });
        } else {
          // If original cash is less than refund amount, set to 0
          await tx.cashPayment.update({
            where: { id: payment.cash.id },
            data: {
              receivedCash: "0",
            },
          });
        }
      } else if (payment.type === "CHECK" && payment.check) {
        // For checks, add or update refund note
        const checkNumber = payment.check.checkNumber || "";
        const baseCheckNumber = checkNumber.replace(
          / \(Refunded: \$[\d.]+\)/,
          "",
        );

        await tx.checkPayment.update({
          where: { id: payment.check.id },
          data: {
            checkNumber: baseCheckNumber
              ? `${baseCheckNumber} (Refunded: $${refundAmount})`
              : `Refunded: $${refundAmount}`,
          },
        });
      }
      // For CARD, OTHER, and DEPOSIT types, the refund tracking is handled at the payment level
    });

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

// New deleteRefund function
interface DeleteRefundParams {
  paymentId: number;
}

export async function deleteRefund({ paymentId }: DeleteRefundParams) {
  try {
    const companyId = await getCompanyId();

    // Get the payment with all related data
    const payment = await db.payment.findUnique({
      where: { id: paymentId, companyId },
      include: {
        card: true,
        cash: true,
        check: true,
        other: true,
        deposit: true,
      },
    });

    if (!payment) {
      return {
        type: "globalError" as const,
        message: "Payment not found",
        errorSource: [],
      };
    }

    const currentRefunded = Number(payment.refundedAmount) || 0;
    const currentAmount = Number(payment.amount) || 0;
    const originalAmount = currentAmount + currentRefunded;

    // Start transaction
    await db.$transaction(async (tx) => {
      // Restore payment to original state
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          amount: originalAmount, // Restore original amount
          refundedAmount: 0, // Reset refunded amount
          refundMethod: null, // Clear refund method
          refundReason: null, // Clear refund reason
          refundCreatedAt: null, // Clear refund date
          refundUpdatedAt: null, // Clear refund update date
        },
      });

      // Handle payment method specific restore
      if (payment.type === "CASH" && payment.cash) {
        // For cash payments, restore the original received cash amount
        await tx.cashPayment.update({
          where: { id: payment.cash.id },
          data: {
            receivedCash: originalAmount.toString(),
          },
        });
      } else if (payment.type === "CHECK" && payment.check) {
        // For checks, remove the refund notation
        const checkNumber = payment.check.checkNumber || "";
        const baseCheckNumber = checkNumber.replace(
          / \(Refunded: \$[\d.]+\)/,
          "",
        );

        await tx.checkPayment.update({
          where: { id: payment.check.id },
          data: {
            checkNumber: baseCheckNumber,
          },
        });
      }
      // For CARD, OTHER, and DEPOSIT types, the refund tracking is handled at the payment level
    });

    revalidatePath("/dashboard/payments");

    return {
      type: "success" as const,
      message: "Refund removed successfully",
    };
  } catch (error) {
    console.error("Error removing refund:", error);
    return {
      type: "globalError" as const,
      message: "Failed to remove refund",
      errorSource: [],
    };
  }
}
