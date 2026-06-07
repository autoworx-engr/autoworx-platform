"use server";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { sendEstimateCreateNotification } from "@/lib/notification/invoice-notify";
import { ServerAction } from "@/types/action";
import { TErrorHandler } from "@/types/globalError";
import { TCreateDraftEstimateValidationSchema } from "@/validations/schemas/pipeline/draftEstimate.validation";

type PrismaTx = Omit<
  typeof db,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

async function getClientByLead(tx: PrismaTx, leadId: number) {
  const client = await tx.client.findFirst({
    where: { leadId },
    include: {
      Lead: {
        select: { id: true, columnId: true },
      },
    },
  });

  if (!client) {
    throw new Error(
      "No client found for this lead. Please attach a client before creating an estimate.",
    );
  }

  return client;
}

async function getPendingColumn(tx: PrismaTx, companyId: number) {
  const column = await tx.column.findFirst({
    where: {
      companyId,
      title: "Pending",
      type: "shop",
    },
  });

  if (!column) {
    throw new Error(
      "Pending column not found. Please configure your pipeline columns properly.",
    );
  }

  return column;
}

// Main
export const createLeadDraftEstimate = async function (
  draftEstimate: TCreateDraftEstimateValidationSchema,
): Promise<ServerAction | TErrorHandler> {
  try {
    const {
      leadId,
      userId,
      companyId,
      clientId,
      vehicleId,
      id: estimateId,
    } = draftEstimate;

    if (!leadId || !clientId) {
      throw new Error(
        "Lead ID and Client ID are required to create an estimate.",
      );
    }

    const response = await db.$transaction(async (tx) => {
      const client = await getClientByLead(tx, leadId);

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

      const pendingColumn = await getPendingColumn(tx, userId);

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
          userId: Number(userId),
          companyId: companyId,
          columnId: pendingColumn.id,
        },
        include: {
          client: { select: { firstName: true, lastName: true } },
        },
      });

      // await sendEstimateCreateNotification({
      //   companyId: newEstimate?.companyId,
      //   invoiceId: newEstimate.id,
      //   invoiceType: newEstimate.type,
      //   clientName:
      //     `${newEstimate.client?.firstName ?? ""} ${newEstimate.client?.lastName ?? ""}`.trim(),
      // });

      return {
        type: "success",
        message: "Draft estimate successfully created.",
        data: newEstimate,
      } satisfies ServerAction;
    });

    if (response?.type === "success") {
      sendEstimateCreateNotification({
        companyId: companyId,
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
