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
        Refund: true,
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
    }

    // ** Check if original payment was a DEPOSIT**
    const isDeposit = payment.type === "DEPOSIT";

    const updatedPayment = await db.$transaction(async (tx) => {
      const existingRefund = await tx.refund.findFirst({
        where: { paymentId: paymentId },
      });

      const invoice = await tx.invoice.findUnique({
        where: { id: payment.invoiceId! },
        select: { due: true, totalPayment: true, deposit: true },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const currentDue = Number(invoice.due) || 0;
      const currentTotalPayment = Number(invoice.totalPayment) || 0;
      const currentDeposit = Number(invoice.deposit) || 0;

      let newDue = currentDue;
      let newTotalPayment = currentTotalPayment;
      let newDeposit = currentDeposit;

      if (existingRefund) {
        const oldRefundAmount = Number(existingRefund.amount) || 0;
        const refundDifference = refundAmount - oldRefundAmount;

        // ** Update deposit or totalPayment based on payment type**
        if (isDeposit) {
          // Refunding a deposit: adjust deposit field
          newDeposit = currentDeposit - refundDifference;
          newDue = currentDue + refundDifference;
        } else {
          // Refunding a payment: adjust totalPayment field
          newDue = currentDue + refundDifference;
          newTotalPayment = currentTotalPayment - refundDifference;
        }

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
        // ** First time creating refund - check payment type**
        if (isDeposit) {
          // Refunding a deposit: decrease deposit and increase due
          newDeposit = currentDeposit - refundAmount;
          newDue = currentDue + refundAmount;
        } else {
          // Refunding a payment: decrease totalPayment and increase due
          newDue = currentDue + refundAmount;
          newTotalPayment = currentTotalPayment - refundAmount;
        }

        await tx.refund.create({
          data: {
            amount: refundAmount,
            reason: refundReason,
            method: refundMethod,
            refundDate: refundDate || new Date(),
            paymentId: paymentId,
            invoiceId: payment.invoiceId!,
            companyId: companyId,
          },
        });
      }

      // ** Update invoice with correct fields**
      await tx.invoice.update({
        where: { id: payment.invoiceId! },
        data: {
          due: newDue,
          totalPayment: newTotalPayment,
          deposit: newDeposit,
        },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: refundAmount,
          refundMethod: refundMethod,
          refundReason: refundReason,
          refundCreatedAt: refundDate || new Date(),
          refundUpdatedAt: new Date(),
        },
      });

      return updatedPayment;
    });

    revalidatePath("/dashboard/estimate/edit");
    revalidatePath("/dashboard/estimate/view");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/client");

    return {
      type: "success" as const,
      message: "Refund processed successfully",
      data: updatedPayment,
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

export async function deleteRefund({ paymentId }: { paymentId: number }) {
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

    // ** Check if original payment was a DEPOSIT**
    const isDeposit = payment.type === "DEPOSIT";

    const updatedPayment = await db.$transaction(async (tx) => {
      const refundToDelete = await tx.refund.findFirst({
        where: { paymentId },
        select: { amount: true },
      });

      if (refundToDelete) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId! },
          select: { due: true, totalPayment: true, deposit: true },
        });

        if (invoice) {
          const currentDue = Number(invoice.due) || 0;
          const currentTotalPayment = Number(invoice.totalPayment) || 0;
          const currentDeposit = Number(invoice.deposit) || 0;
          const refundAmount = Number(refundToDelete.amount) || 0;

          // ** Restore deposit or totalPayment based on payment type**
          let newDue = currentDue - refundAmount;
          let newTotalPayment = currentTotalPayment;
          let newDeposit = currentDeposit;

          if (isDeposit) {
            // Deleting deposit refund: restore deposit
            newDeposit = currentDeposit + refundAmount;
          } else {
            // Deleting payment refund: restore totalPayment
            newTotalPayment = currentTotalPayment + refundAmount;
          }

          await tx.invoice.update({
            where: { id: payment.invoiceId! },
            data: {
              due: newDue,
              totalPayment: newTotalPayment,
              deposit: newDeposit,
            },
          });
        }
      }

      await tx.refund.deleteMany({
        where: { paymentId },
      });

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

    revalidatePath("/dashboard/estimate/edit");
    revalidatePath("/dashboard/estimate/view");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/client");

    return {
      type: "success" as const,
      message: "Refund deleted successfully",
      data: updatedPayment,
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
