import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axiosInstance from "@/helpers/axios";

type TUpdateInvoiceAutomationTrigger = {
  companyId: number;
  invoiceId: string;
  columnId: number;
};
export const updateInvoiceAutomationTrigger = async function (
  payload: TUpdateInvoiceAutomationTrigger,
) {
  try {
    const response = await axiosInstance.patch(
      "/invoice-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    // throw err;
  }
};
