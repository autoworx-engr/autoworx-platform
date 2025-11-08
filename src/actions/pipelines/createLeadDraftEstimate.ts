"use server";

import { authOptions } from "@/authOptions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { TCreateDraftEstimateValidationSchema } from "@/validations/schemas/pipeline/draftEstimate.validation";
import { getServerSession } from "next-auth";

async function getClientByLead(leadId: number) {
  const client = await db.client.findFirst({
    where: { leadId },
    include: {
      Lead: {
        select: { id: true, columnId: true },
      },
    },
  });

  if (!client) {
    throw new Error(
      "No client found for this lead. Please attach a client before creating an estimate."
    );
  }

  return client;
}

async function getPendingColumn(companyId: number) {
  const column = await db.column.findFirst({
    where: {
      companyId,
      title: "Pending",
      type: "shop",
    },
  });

  if (!column) {
    throw new Error(
      "Pending column not found. Please configure your pipeline columns properly."
    );
  }

  return column;
}

// Main
export const createLeadDraftEstimate = async function (
  draftEstimate: TCreateDraftEstimateValidationSchema
): Promise<ServerAction | TErrorHandler> {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      throw new Error("Session is required to create a draft estimate.");

    const { leadId, clientId, vehicleId, id: estimateId } = draftEstimate;

    if (!leadId || !clientId) {
      throw new Error(
        "Lead ID and Client ID are required to create an estimate."
      );
    }

    const response = await db.$transaction(async (tx) => {
      const client = await getClientByLead(leadId);

      const existingEstimate = await tx.invoice.findFirst({
        where: { clientId: client.id },
      });

      if (existingEstimate) {
        return {
          type: "error",
          message: "A draft estimate already exists for this client.",
          data: existingEstimate,
        } satisfies ServerAction;
      }

      const pendingColumn = await getPendingColumn(session.user.companyId);

      await tx.lead.update({
        where: { id: leadId },
        data: { isEstimateCreated: true },
      });

      const newEstimate = await tx.invoice.create({
        data: {
          id: estimateId,
          type: "Estimate",
          clientId,
          vehicleId,
          userId: Number(session.user.id),
          companyId: session.user.companyId,
          columnId: pendingColumn.id,
        },
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      });

      await sendEstimateCreateNotification({
        companyId: newEstimate?.companyId,
        invoiceId: newEstimate.id,
        invoiceType: newEstimate.type,
        clientName:
          `${newEstimate.client?.firstName ?? ""} ${newEstimate.client?.lastName ?? ""}`.trim(),
      });

      return {
        type: "success",
        message: "Draft estimate successfully created.",
        data: newEstimate,
      } satisfies ServerAction;
    });

    if (response?.type === "success") {
      sendEstimateCreateNotification({
        companyId: session.user.companyId,
        invoiceId: response?.data.id,
        invoiceType: response?.data.type,
        clientName:
          `${response?.data.client?.firstName ?? ""} ${response?.data.client?.lastName ?? ""}`.trim(),
      });
    }

    return response;
  } catch (err) {
    return errorHandler(err);
  }
};
