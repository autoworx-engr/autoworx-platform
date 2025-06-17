import axiosInstance from "@/helpers/axios";

interface IPipelineData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createPipelineAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/pipeline-automation-rules",
      payload,
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllPipelineAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/pipeline-automation-rules?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOnePipelineAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(
      `/pipeline-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePipelineAutomationRule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(
      `/pipeline-automation-rules/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deletePipelineAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/pipeline-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
