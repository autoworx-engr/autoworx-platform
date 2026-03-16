import { errorHandler } from "@/error-boundary/globalErrorHandler";
import axios from "axios";

export interface ThemeConfig {
  primaryColor: string;
  fontFamily?: string;
}

export interface ShopData {
  id?: number;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeConfig?: ThemeConfig;
}

export const configureVirtualShop = async function (payload: ShopData) {
  try {
    const response = await axios.post(`/api/virtual-shop/configure`, payload);

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopByCompanyId = async function (companyId: number) {
  try {
    const response = await axios.get(
      `/api/virtual-shop/configure/${companyId}`,
    );

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateShopConfigure = async function (
  payload: ShopData,
  companyId: number,
) {
  try {
    const response = await axios.patch(
      `/api/virtual-shop/configure/${companyId}`,
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
