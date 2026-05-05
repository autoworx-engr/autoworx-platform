import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axiosInstance from "@/helpers/axios";

type TUpdateTagAutomationTrigger = {
  companyId: number;
  leadId?: number;
  invoiceId?: string;
  columnId: number;
  tagId?: number;
  pipelineType: "SALES" | "SHOP";
  conditionType?: "pipeline" | "communication" | "post_tag" | null;
};
export const updateTagAutomationTrigger = async function (
  payload: TUpdateTagAutomationTrigger,
) {
  try {
    const response = await axiosInstance.patch(
      "/tag-automation-trigger",
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
