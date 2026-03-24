import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axiosInstance from "@/helpers/axios";

export const getCollaboratorsConnectedList = async function () {
  try {
    const response = await axiosInstance.get(
      `/api/communication/collaboration/company/connect`,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const readCollaboratorsMessage = async function () {
  try {
    const response = await axiosInstance.get(
      `/api/communication/collaboration/company/connect`,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
