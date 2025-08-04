import axiosInstance from "@/helpers/axios";

type TUpdateServiceAutomationTrigger = {
  companyId: number;
  estimateId: string;
  columnId: number;
};
export const updateServiceAutomationTrigger = async function (
  payload: TUpdateServiceAutomationTrigger,
) {
  try {
    const response = await axiosInstance.patch(
      "/service-automation-trigger",
      payload,
    );
    return response.data;
  } catch (error) {
    console.log("🚀 ~ error:", error);
  }
};
