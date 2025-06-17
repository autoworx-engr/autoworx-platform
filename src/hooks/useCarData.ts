// hooks/useCarData.ts
import {
  getAllYears,
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
