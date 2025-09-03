'use server';

import { getCompanyId } from '@/lib/companyId';
import { db } from '@/lib/db';
import { PaymentType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
        Refund: true, // Include existing refunds
      },
    });

    if (!payment) {
      return {
        type: 'globalError' as const,
        message: 'Payment not found',
        errorSource: [],
      };
    }

    const originalAmount = Number(payment.amount) || 0;

    // For validation, check if the new refund amount exceeds the original payment
    if (refundAmount > originalAmount) {
      return {
        type: 'globalError' as const,
        message: `Refund amount cannot exceed original payment amount. Maximum: $${originalAmount.toFixed(2)}`,
        errorSource: [],
      };
    }

    if (refundAmount <= 0) {
      return {
        type: 'globalError' as const,
        message: 'Refund amount must be greater than 0',
        errorSource: [],
      };
    } // Start transaction - create or update refund record (only one refund per payment)
    const updatedPayment = await db.$transaction(async tx => {
      // Check if a refund record already exists for this payment
      const existingRefund = await tx.refund.findFirst({
        where: { paymentId: paymentId },
      });

      // Get the current invoice to update the due amount and totalPayment
      const invoice = await tx.invoice.findUnique({
        where: { id: payment.invoiceId! },
        select: { due: true, totalPayment: true },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const currentDue = Number(invoice.due) || 0;
      const currentTotalPayment = Number(invoice.totalPayment) || 0;
      let newDue = currentDue;
      let newTotalPayment = currentTotalPayment;

      if (existingRefund) {
        // Calculate the difference between old and new refund amounts
        const oldRefundAmount = Number(existingRefund.amount) || 0;
        const refundDifference = refundAmount - oldRefundAmount;

        // When refund increases: due increases (less payment received), totalPayment decreases
        // When refund decreases: due decreases (more payment received), totalPayment increases
        newDue = currentDue + refundDifference;
        newTotalPayment = currentTotalPayment - refundDifference;

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
        // First time creating refund: due increases by refund amount, totalPayment decreases
        newDue = currentDue + refundAmount;
        newTotalPayment = currentTotalPayment - refundAmount;

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

      // Update invoice due amount and totalPayment
      await tx.invoice.update({
        where: { id: payment.invoiceId! },
        data: {
          due: newDue,
          totalPayment: newTotalPayment,
        },
      });

      // Update payment's refunded amount for quick access (but don't modify original amount)
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: refundAmount, // Set to the current refund amount (not accumulated)
          refundMethod: refundMethod,
          refundReason: refundReason,
          refundCreatedAt: refundDate || new Date(),
          refundUpdatedAt: new Date(),
        },
      });
      return updatedPayment;
    });
    revalidatePath('/dashboard/estimate/edit');
    revalidatePath('/dashboard/payments');
    return {
      type: 'success' as const,
      message: 'Refund processed successfully',
      data: updatedPayment,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      type: 'globalError' as const,
      message: 'Failed to process refund',
      errorSource: [],
    };
  }
}

/**
 * Delete refund - removes all refund records for a payment and resets payment state
 */
export async function deleteRefund({ paymentId }: { paymentId: number }) {
  try {
    const companyId = await getCompanyId();

    const payment = await db.payment.findUnique({
      where: { id: paymentId, companyId },
    });

    if (!payment) {
      return {
        type: 'globalError' as const,
        message: 'Payment not found',
        errorSource: [],
      };
    }

    const updatedPayment = await db.$transaction(async tx => {
      // Get the refund amount before deleting to adjust the invoice due and totalPayment
      const refundToDelete = await tx.refund.findFirst({
        where: { paymentId },
        select: { amount: true },
      });

      if (refundToDelete) {
        // Get the current invoice to update the due amount and totalPayment
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId! },
          select: { due: true, totalPayment: true },
        });

        if (invoice) {
          const currentDue = Number(invoice.due) || 0;
          const currentTotalPayment = Number(invoice.totalPayment) || 0;
          const refundAmount = Number(refundToDelete.amount) || 0;

          // When deleting refund: due decreases (more payment received), totalPayment increases
          const newDue = currentDue - refundAmount;
          const newTotalPayment = currentTotalPayment + refundAmount;

          // Update invoice due amount and totalPayment by restoring the refunded amount
          await tx.invoice.update({
            where: { id: payment.invoiceId! },
            data: {
              due: newDue,
              totalPayment: newTotalPayment,
            },
          });
        }
      }

      // Delete all refund records for this payment
      await tx.refund.deleteMany({
        where: { paymentId },
      });

      // Reset payment refund fields to restore original payment state
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: 0,
          refundMethod: null,
          refundReason: null,
          refundCreatedAt: null,
          refundUpdatedAt: null,
        },
      });
      return updatedPayment;
    });

    revalidatePath('/dashboard/estimate/edit');
    revalidatePath('/dashboard/payments');
    return {
      type: 'success' as const,
      message: 'Refund deleted successfully',
      data: updatedPayment,
    };
  } catch (error) {
    console.error('Error deleting refund:', error);
    return {
      type: 'globalError' as const,
      message: 'Failed to delete refund',
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

  return payments.map(payment => ({
    ...payment,
    originalAmount: Number(payment.amount) || 0,
    refundedAmount: Number(payment.refundedAmount) || 0,
    netAmount:
      (Number(payment.amount) || 0) - (Number(payment.refundedAmount) || 0),
    paymentMethod:
      payment.type === 'CARD'
        ? payment.card?.cardType || 'CARD'
        : payment.type === 'CASH'
          ? 'CASH'
          : payment.type === 'OTHER'
            ? payment.other?.paymentMethod?.name || 'OTHER'
            : payment.type,
  }));
}
