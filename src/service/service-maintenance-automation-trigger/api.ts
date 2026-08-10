"use server";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { serverAxios } from "@/helpers/server-axios";

type TUpdateServiceAutomationTrigger = {
  companyId: number;
  estimateId: string;
  columnId: number;
};
export const updateServiceAutomationTrigger = async function (
  payload: TUpdateServiceAutomationTrigger,
) {
  try {
    const response = await serverAxios.patch(
      "/service-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
