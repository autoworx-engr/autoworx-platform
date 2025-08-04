"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { getServerSession } from "next-auth";

export async function getFleetStatement(
  statementId: string,
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const statement = await db.fleetStatement.findFirst({
      where: {
        id: statementId,
        Fleet: {
          client: {
            companyId: companyId,
          },
        },
      },
      include: {
        Fleet: {
          include: {
            client: {
              include: {
                company: true,
              },
            },
          },
        },

        invoice: {
          include: {
            vehicle: true,
            client: true,
            column: true,
          },
        },
      },
    });

    if (!statement) {
      throw new Error("Fleet statement not found");
    }

    // Calculate totals
    const totalAmount = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal || 0),
      0,
    );

    const totalPaid = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.totalPayment || 0),
      0,
    );

    const totalDue = statement.invoice.reduce(
      (sum, invoice) => sum + Number(invoice.due || 0),
      0,
    );

    return {
      type: "success",
      message: "Fleet statement retrieved successfully",
      data: {
        ...statement,
        totals: {
          totalAmount,
          totalPaid,
          totalDue,
        },
      },
    };
  } catch (error: any) {
    console.error("Error getting fleet statement:", error);
    return errorHandler(error);
  }
}
