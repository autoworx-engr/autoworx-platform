import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axios from "axios";

type TSendSMSToAIAgent = {
  message: string;
  sendFrom: string;
  sendTo: string;
  companyId: number;
};

export const sendSMSToAgent = async function (payload: TSendSMSToAIAgent) {
  try {
    const response = await axios.post(
      "https://primary-production-4c22d.up.railway.app/webhook-test/a7db912a-d7ef-42c7-bc2f-89cb49ac39b9",
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
