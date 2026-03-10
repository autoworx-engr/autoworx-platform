// hooks/useCarData.ts
import {
  getAllYears,
  getCarVinDecoder,
  getMake,
  getModelsByYearAndMake,
} from "@/service/car/api";
import { useQuery } from "@tanstack/react-query";

export const useGetAllYears = () => {
  return useQuery({
    queryKey: ["car-years"],
    queryFn: getAllYears,
  });
};

export const useGetMake = () => {
  return useQuery({
    queryKey: ["car-makes"],
    queryFn: getMake,
  });
};

type VinDecoderParams = {
  vin: string;
  verbose?: boolean;
  allTrims?: boolean;
};

export const CAR_VIN_DECODER_QUERY_KEY = "car-vin-decoder";

export const useCarVinDecoder = ({
  vin,
  verbose,
  allTrims,
}: VinDecoderParams) => {
  return useQuery({
    queryKey: [CAR_VIN_DECODER_QUERY_KEY, verbose, allTrims],
    queryFn: () => getCarVinDecoder(vin, { verbose, allTrims }),
    enabled: !!vin,
  });
};

export const useGetModelsByYearAndMake = (
  year: string,
  make: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["car-models", year, make],
    queryFn: () => getModelsByYearAndMake(year, make),
    enabled: enabled && !!year && !!make, // only run if both are provided
  });
};
