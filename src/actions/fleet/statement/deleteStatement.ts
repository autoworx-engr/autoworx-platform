"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteFleetStatementSchema = z.object({
  statementId: z.string(),
});

export async function deleteFleetStatement(data: {
  statementId: string;
}): Promise<ServerAction | TErrorHandler> {
  try {
    // Validate input
    await deleteFleetStatementSchema.parseAsync(data);

    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required to delete a fleet statement");
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

    // Check if any invoices have been paid or partially paid
    const hasPaidInvoices = existingStatement.invoice.some((inv) => {
      const due = Number(inv.due ?? 0);
      const total = Number(inv.grandTotal ?? 0);

      return due === 0 || due < total;
    });

    if (hasPaidInvoices) {
      throw new Error(
        "Cannot delete statement with paid or partially paid invoices.",
      );
    }

    // Delete the fleet statement
    await db.$transaction(async (tx) => {
      // Remove the statement reference from all invoices
      await tx.invoice.updateMany({
        where: {
          fleetStatementId: data.statementId,
        },
        data: {
          fleetStatementId: null,
        },
      });

      // Delete the statement
      await tx.fleetStatement.delete({
        where: {
          id: data.statementId,
        },
      });
    });

    revalidatePath("/dashboard/fleet");

    return {
      type: "success",
      message: "Fleet statement deleted successfully",
    };
  } catch (error: any) {
    return errorHandler(error);
  }
}
