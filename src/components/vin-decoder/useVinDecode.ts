"use client";

import { CAR_VIN_DECODER_QUERY_KEY } from "@/hooks/useCarData";
import { errorToast } from "@/lib/toast";
import { getCarVinDecoder } from "@/service/car/api";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type VinDecodeResult = {
  vin: string;
  data: Record<string, any>;
};

export type VinDecodedFields = {
  year?: any;
  make?: any;
  model?: any;
  displacement_cc?: any;
};

// Both the scanner modal and the manual VIN fields share this exact
// nested shape returned by the external VIN decoder API.
export function extractVinFields(
  result: VinDecodeResult | null,
): VinDecodedFields {
  const { make, model, year, specs } = result?.data?.data || {};
  const { displacement_cc } = specs || {};
  return { year, make, model, displacement_cc };
}

export function useVinDecode() {
  const [isDecoding, setIsDecoding] = useState(false);
  const queryClient = useQueryClient();

  const decodeVin = async (vin: string): Promise<VinDecodeResult | null> => {
    if (!vin || vin.trim().length < 5) return null;

    try {
      setIsDecoding(true);
      const data = await queryClient.fetchQuery({
        queryKey: [CAR_VIN_DECODER_QUERY_KEY, false, false],
        queryFn: () => getCarVinDecoder(vin),
      });
      return { vin, data };
    } catch (err) {
      console.error("Error decoding VIN:", err);
      errorToast("Failed to decode VIN. Please try again.");
      return null;
    } finally {
      setIsDecoding(false);
    }
  };

  return { decodeVin, isDecoding };
}
