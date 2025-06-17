import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axiosInstance from "@/helpers/axios";
import { ConditionType } from "@prisma/client";

type TUpdatePipelineAutomationTrigger = {
  condition: ConditionType;
  companyId: number;
  leadId: number;
  columnId: number;
};
export const updatePipelineAutomationTrigger = async function (
  payload: TUpdatePipelineAutomationTrigger,
) {
  try {
    console.log("🚀 ~ payload:", payload);
    const response = await axiosInstance.patch(
      "/pipeline-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
