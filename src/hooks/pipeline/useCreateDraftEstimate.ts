import { useMutation } from "@tanstack/react-query";

interface CreateDraftEstimatePayload {
  companyId: string;
  leadId: number;
  clientId: number;
  vehicleId?: number;
}

interface CreateDraftEstimateResponse {
  success: boolean;
  data?: any;
  message?: string;
}

const createDraftEstimate = async (
  payload: CreateDraftEstimatePayload,
): Promise<CreateDraftEstimateResponse> => {
  const { companyId, ...body } = payload;
  const response = await fetch(`/api/estimate/${companyId}/draft-estimate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // If status is 409, it means the draft estimate already exists, so we return the data to be handled by the caller.
  if (!response.ok && response.status !== 409) {
    throw new Error(data?.message || "Failed to create draft estimate");
  }

  return data;
};

export const useCreateDraftEstimate = () => {
  return useMutation<
    CreateDraftEstimateResponse,
    Error,
    CreateDraftEstimatePayload
  >({
    mutationFn: createDraftEstimate,
    onSuccess: (data) => {
      if (!data.success) {
        throw new Error(data?.message || "Failed to create draft estimate");
      }
    },
  });
};
