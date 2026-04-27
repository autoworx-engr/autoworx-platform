"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { serverAxios } from "@/helpers/server-axios";
import { InvoiceType } from "@prisma/client";

type TUpdateInvoiceAutomationTrigger = {
  companyId: number;
  invoiceId: string;
  columnId: number;
  type: InvoiceType;
};
export const updateInvoiceAutomationTrigger = async function (
  payload: TUpdateInvoiceAutomationTrigger,
) {
  try {
    const response = await serverAxios.patch(
      "/invoice-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
