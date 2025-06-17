// services/carService.ts
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const getAllYears = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/cars/years`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch years:", error);
    throw error;
  }
};

export const getMake = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/api/cars/makes`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch makes:", error);
    throw error;
  }
};

export const getModelsByYearAndMake = async (
  year: string,
  make: string,
): Promise<string[]> => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/cars/models?year=${year}&make=${make}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Failed to fetch models for year=${year} and make=${make}:`,
      error,
    );
    throw error;
  }
};
