import axios from "axios";

export const fetchVehicleMakes = async () => {
  const response = await axios.get("https://carapi.app/api/makes");
  return response.data.data;
};
