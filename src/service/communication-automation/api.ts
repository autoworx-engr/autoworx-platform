import axiosInstance from "@/helpers/axios";

interface ICommunicationData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createCommunicationAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/communication-automation",
      payload,
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllCommunicationAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/communication-automation?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneCommunicationAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/communication-automation/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCommunicationAutomationRule = async (
  id: string,
  companyId: string,
  data: any,
) => {
  try {
    const response = await axiosInstance.patch(
      `/communication-automation/${id}?companyId=${companyId}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteCommunicationAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/communication-automation/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
