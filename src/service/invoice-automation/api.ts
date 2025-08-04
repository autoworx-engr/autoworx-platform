import axiosInstance from "@/helpers/axios";
import { InvoiceAutomationRule } from "@prisma/client";

export const createInvoiceAutomationRule = async (
  payload: InvoiceAutomationRule,
) => {
  try {
    const response = await axiosInstance.post(
      "/invoice-automation-rule",
      payload,
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const AllInvoiceAutomationRules = async (companyId: number) => {
  try {
    const response = await axiosInstance.get(
      `/invoice-automation-rule?companyId=${companyId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const findOneInvoiceAutomationRules = async (id: number) => {
  try {
    const response = await axiosInstance.get(`/invoice-automation-rule/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateInvoiceAutomationRule = async (
  id: string,
  data: InvoiceAutomationRule,
) => {
  try {
    const response = await axiosInstance.patch(
      `/invoice-automation-rule/${id}`,
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
      `/invoice-automation-rule/${id}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};
