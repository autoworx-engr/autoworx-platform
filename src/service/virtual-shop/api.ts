// lib/api/virtual-shop.ts
import axios from "axios";

/**
 * Theme configuration for a virtual shop
 */
export interface ThemeConfig {
  primaryColor: string;
  fontFamily?: string;
}

/**
 * Data structure for creating or updating a shop
 */
export interface ShopData {
  id?: number;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  themeConfig?: ThemeConfig;
}

/** Base API endpoint for virtual shop configuration */
const BASE_URL = "/api/virtual-shop/configure";

/**
 * Create a new virtual shop
 * @param data Shop data to create
 * @returns Created shop object
 */
export const createShop = async (data: ShopData) => {
  const response = await axios.post(BASE_URL, data);
  return response.data;
};

/**
 * Fetch all shops or a single shop by ID
 * @param id Optional shop ID
 * @returns Shop or array of shops
 */
export const getShops = async (id?: number) => {
  const url = id ? `${BASE_URL}?id=${id}` : BASE_URL;
  const response = await axios.get(url);
  return response.data;
};

/**
 * Update an existing shop
 * @param data Shop data including `id`
 * @returns Updated shop object
 */
export const updateShop = async (data: ShopData) => {
  if (!data.id) throw new Error("Shop ID is required for update");
  const response = await axios.patch(BASE_URL, data);
  return response.data;
};

/**
 * Delete a shop by ID
 * @param id Shop ID
 * @returns Success message
 */
export const deleteShop = async (id: number) => {
  const response = await axios.delete(BASE_URL, { data: { id } });
  return response.data;
};

/**
 * Check if a slug is available
 * @param slug Slug to check
 * @returns Boolean indicating availability
 */
export const checkSlug = async (slug: string) => {
  const response = await axios.get(`${BASE_URL}/check-slug?slug=${slug}`);
  return response.data.available as boolean;
};
