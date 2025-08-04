import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axiosInstance from "@/helpers/axios";

type TUpdateCommunicationAutomationTrigger = {
  companyId: number;
  leadId: number;
  columnId: number;
};
export const updateCommunicationAutomationTrigger = async function (
  payload: TUpdateCommunicationAutomationTrigger,
) {
  try {
    const response = await axiosInstance.patch(
      "/communication-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
