import axios from "axios";

export const allCompanies = async () => {
  try {
    const response = await axios.get(`/api/company`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
