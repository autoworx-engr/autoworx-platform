"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const editFleetStatementSchema = z.object({
  statementId: z.string(),
  invoiceIds: z.array(z.string()).min(1, "At least one invoice is required"),
});

export async function editFleetStatement(data: {
  statementId: string;
  invoiceIds: string[];
}): Promise<ServerAction | TErrorHandler> {
  try {
    // Validate input
    await editFleetStatementSchema.parseAsync(data);

    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to edit a fleet statement");
    }

    // Verify statement exists and belongs to company
    const existingStatement = await db.fleetStatement.findFirst({
      where: {
        id: data.statementId,
        Fleet: {
          client: {
            companyId: companyId,
          },
        },
      },
      include: {
        Fleet: {
          include: {
            client: true,
          },
        },
        invoice: true,
      },
    });

    if (!existingStatement) {
      throw new Error("Statement not found or doesn't belong to your company");
    }

    const hasPaidInvoices = existingStatement.invoice.some((inv) => {
      const due = Number(inv.due ?? 0);
      const total = Number(inv.grandTotal ?? 0);

      return due === 0 || due < total;
    });

    if (hasPaidInvoices) {
      throw new Error(
        "Cannot edit statement with paid or partially paid invoices.",
      );
    }

    // Get new invoices to add
    const newInvoices = await db.invoice.findMany({
      where: {
        id: {
          in: data.invoiceIds,
        },
        clientId: existingStatement.Fleet.clientId,
        companyId: companyId,
        due: {
          gt: 0, // Only unpaid invoices
        },
        OR: [
          { fleetStatementId: null },
          { fleetStatementId: data.statementId }, // Allow existing invoices in this statement
        ],
      },
    });

    if (newInvoices.length !== data.invoiceIds.length) {
      throw new Error(
        "invoices are not found, don't belong to the fleet, are already paid",
      );
    }

    // Update the fleet statement
    const updatedStatement = await db.$transaction(async (tx) => {
      // Remove all invoices from the statement
      await tx.invoice.updateMany({
        where: {
          fleetStatementId: data.statementId,
        },
        data: {
          fleetStatementId: null,
        },
      });

      // Add new invoices to the statement
      await tx.invoice.updateMany({
        where: {
          id: {
            in: data.invoiceIds,
          },
        },
        data: {
          fleetStatementId: data.statementId,
        },
      });

      // Return updated statement
      return await tx.fleetStatement.findUnique({
        where: { id: data.statementId },
        include: {
          invoice: true,
        },
      });
    });

    revalidatePath("/dashboard/fleet");

    return {
      type: "success",
      message: "Fleet statement updated successfully",
      data: updatedStatement,
    };
  } catch (error: any) {
    return errorHandler(error);
  }
}
