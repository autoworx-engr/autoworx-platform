import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axios from "axios";

type TSendSMSToAIAgent = {
  message: string;
  send_from: string;
  send_to: string;
  company_id: number;
  client_id: number;
  user_id?: number;
};

export const sendSMSToAgent = async function (payload: TSendSMSToAIAgent) {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_SALES_AGENT_API_BASE_URL}/webhook/a7db912a-d7ef-42c7-bc2f-89cb49ac39b9`,
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
