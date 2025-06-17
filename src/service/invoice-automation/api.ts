import axiosInstance from "@/helpers/axios";

interface IInvoiceData {
  title: string;
  stageId: number[];
  conditionType: string;
  actionType: string;
  targetColumnId: number;
  timeDelay?: number;
  companyId: number;
  TTimeUnit?: string;
}

export const createInvoiceAutomationRule = async (payload: any) => {
  try {
    const response = await axiosInstance.post(
      "/invoice-automation-rules",
      payload,
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllInvoiceAutomationRules = async () => {
  try {
    const response = await axiosInstance.get(`/invoice-automation-rules`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneInvoiceAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/invoice-automation-rules/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateInvoiceAutomationRule = async (id: string, data: any) => {
  try {
    const response = await axiosInstance.patch(
      `/invoice-automation-rules/${id}`,
      data,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteInvoiceAutomationRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(
      `/invoice-automation-rules/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
