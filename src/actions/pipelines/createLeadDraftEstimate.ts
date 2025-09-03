"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { updateInvoiceAutomationTrigger } from "@/service/invoice-automation-trigger/api";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { TCreateDraftEstimateValidationSchema } from "@/validations/schemas/pipeline/draftEstimate.validation";
import { getServerSession } from "next-auth";

export const createLeadDraftEstimate = async function (
  draftEstimate: TCreateDraftEstimateValidationSchema
  // @ts-ignore
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Session ID is required");
    }

    const response = await db.$transaction(async (db) => {
      if (draftEstimate.leadId) {
        const hasClient = await db.client.findFirst({
          where: {
            leadId: draftEstimate.leadId,
          },
          include: {
            Lead: {
              select: {
                id: true,
                columnId: true,
              },
            },
          },
        });
        if (!hasClient) {
          throw new Error("This lead does not have a client");
        }
        const findDraftEstimate = await db.invoice.findFirst({
          where: {
            clientId: hasClient.id,
          },
        });
        const columnId = await db.column.findFirst({
          where: {
            companyId: session.user.companyId,
            title: "Pending",
            type: "shop",
          },
        });
        // Update the lead to set estimateCreated to true
        await db.lead.update({
          where: { id: draftEstimate.leadId },
          data: { isEstimateCreated: true },
        });

        if (!findDraftEstimate) {
          const newDraftEstimate = await db.invoice.create({
            data: {
              id: draftEstimate.id,
              type: "Estimate",
              clientId: draftEstimate.clientId,
              vehicleId: draftEstimate.vehicleId,
              userId: Number(session.user.id),
              companyId: session.user.companyId,
              columnId: columnId?.id,
            },
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });

          // Trigger automation
          updateInvoiceAutomationTrigger({
            companyId: newDraftEstimate.companyId,
            invoiceId: newDraftEstimate.id,
            columnId: newDraftEstimate.columnId!,
            type: newDraftEstimate.type,
          });

          // send notification for invoice creation
          sendEstimateCreateNotification({
            companyId: session.user.companyId,
            invoiceId: newDraftEstimate.id,
            invoiceType: newDraftEstimate.type,
            clientName:
              newDraftEstimate.client?.firstName +
              " " +
              newDraftEstimate.client?.lastName,
          });

          return {
            type: "success",
            message: "Draft estimate created",
            data: newDraftEstimate,
          };
        } else {
          return {
            type: "error",
            message: "Draft estimate already exists",
            data: findDraftEstimate,
          };
        }
      }
    });
    return response as ServerAction;
  } catch (err) {
    return errorHandler(err);
  }
};
