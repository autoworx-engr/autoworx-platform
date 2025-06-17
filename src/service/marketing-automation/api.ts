import axiosInstance from "@/helpers/axios";

interface IMarketingData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createMarketingAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/marketing-automation-rules",
      payload,
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllMarketingAutomationRules = async () => {
  try {
    const response = await axiosInstance.get(`/marketing-automation-rules`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneMarketingAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(
      `/marketing-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateMarketingAutomationRule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(
      `/marketing-automation-rules/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteMarketingAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/marketing-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
