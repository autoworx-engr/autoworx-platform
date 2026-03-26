import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TCreateShopServiceRequest } from "@/validations/schemas/virtual-shop/shop-service.validation";
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
  companyId?: number;
  isActive?: boolean;
}

export type CreateShopServicePayload = TCreateShopServiceRequest & {
  companyId?: number;
};

export interface CreateShopServiceResponse {
  success: boolean;
  data: {
    id: number;
    shopId: number;
    title: string;
    description: string | null;
    price: number;
    duration: number;
    imageUrl: string | null;
    category: string[];
    modifierCoupe: number;
    modifierSedan: number;
    modifierSUV: number;
    modifierTruck: number;
    isActive: boolean;
  };
}

export interface DeleteShopServiceResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
  };
}

export type UpdateShopServicePayload = CreateShopServicePayload;

export interface UpdateShopServiceResponse {
  success: boolean;
  data: {
    id: number;
    shopId: number;
    title: string;
    description: string | null;
    price: number;
    duration: number;
    imageUrl: string | null;
    category: string[];
    modifierCoupe: number;
    modifierSedan: number;
    modifierSUV: number;
    modifierTruck: number;
    isActive: boolean;
  };
}

export interface ShopServiceApi {
  id: number;
  title: string;
  category: string[];
  price: number | string;
  duration: number;
  description?: string | null;
  imageUrl?: string | null;
  modifierCoupe?: number | string;
  modifierSedan?: number | string;
  modifierSUV?: number | string;
  modifierTruck?: number | string;
}

export interface ShopServicesResponse {
  success: boolean;
  meta: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  data: ShopServiceApi[];
}

export interface AppointmentSlot {
  time: string;
  available: boolean;
}

export interface AppointmentSlotsResponse {
  success: boolean;
  date?: string;
  data: AppointmentSlot[];
}

export interface CreateVirtualShopServiceBookingPayload {
  shopId: number;
  shopServices: Array<{
    shopServiceId: number;
    vehicleType?: string;
  }>;
  appointmentDate: string;
  appointmentStartTime: string;
  fullName?: string;
  email?: string;
  phone: string;
  make: string;
  model: string;
  year: number;
  notes?: string;
  depositAmount?: number;
}

export interface CreateVirtualShopServiceBookingResponse {
  success: boolean;
  message: string;
  data: {
    appointmentId: number;
    estimateId: string;
    shopBookingId: number;
    status: string;
    appointment: {
      date: string;
      startTime: string;
    };
    client: {
      firstName: string;
      lastName?: string;
      email?: string;
      mobile: string;
    };
    vehicle: {
      year: number;
      make: string;
      model: string;
    };
    services: Array<{
      title: string;
      price: number;
    }>;
    totals: {
      subtotal: number;
      tax: number;
      serviceFee: number;
      grandTotal: number;
    };
  };
}

interface AppointmentSlotsApiResponse {
  success: boolean;
  date?: string;
  availableSlots?: string[];
  data?: AppointmentSlot[];
}

export type GetShopServicesParams = {
  shopId: number;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
};

export interface ShopBookingSettingsData {
  id: number;
  shopId: number;
  isDepositEnabled: boolean;
  depositType: "FIXED" | "PERCENTAGE" | null;
  depositValue: number | string | null;
  isStackingEnabled: boolean;
  stackingLimit: number;
  slotInterval: number;
  isTaxEnabled: boolean;
  isServiceFeeEnabled: boolean;
  availabilities: Array<{
    dayOfWeek:
      | "MONDAY"
      | "TUESDAY"
      | "WEDNESDAY"
      | "THURSDAY"
      | "FRIDAY"
      | "SATURDAY"
      | "SUNDAY";
    isOpen: boolean;
    startTime: string | null;
    endTime: string | null;
  }>;
}

export interface UpdateShopBookingSettingsPayload {
  shopId: number;
  isDepositEnabled?: boolean;
  depositType?: "FIXED" | "PERCENTAGE";
  depositValue?: number | null;
  isStackingEnabled?: boolean;
  stackingLimit?: number;
  slotInterval?: number;
  isTaxEnabled?: boolean;
  isServiceFeeEnabled?: boolean;
  availabilities?: Array<{
    dayOfWeek:
      | "MONDAY"
      | "TUESDAY"
      | "WEDNESDAY"
      | "THURSDAY"
      | "FRIDAY"
      | "SATURDAY"
      | "SUNDAY";
    isOpen?: boolean;
    startTime?: string | null;
    endTime?: string | null;
  }>;
}

export type GiftCardDeliveryMethod = "EMAIL" | "SMS" | "BOTH";

export interface GiftCardSettingsData {
  id: number;
  companyId: number;
  allowCustomAmount: boolean;
  minCustomAmount: number | string | null;
  maxCustomAmount: number | string | null;
  presetAmounts: number[] | null;
  allowEmailDelivery: boolean;
  allowSmsDelivery: boolean;
  defaultDelivery: GiftCardDeliveryMethod;
  allowScheduledSend: boolean;
  defaultExpiryDays: number | null;
  termsAndConditions: string | null;
  privacyPolicy: string | null;
}

export interface UpdateGiftCardSettingsPayload {
  allowCustomAmount?: boolean;
  minCustomAmount?: number | null;
  maxCustomAmount?: number | null;
  presetAmounts?: number[] | null;
  allowEmailDelivery?: boolean;
  allowSmsDelivery?: boolean;
  defaultDelivery?: GiftCardDeliveryMethod;
  allowScheduledSend?: boolean;
  defaultExpiryDays?: number | null;
  termsAndConditions?: string | null;
  privacyPolicy?: string | null;
}

export interface GiftCardTemplateData {
  id: number;
  companyId: number;
  name: string;
  imageUrl: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGiftCardTemplatePayload {
  name: string;
  imageUrl: string;
  isActive?: boolean;
  isDefault?: boolean;
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

export const createShopService = async function (
  payload: CreateShopServicePayload,
) {
  try {
    const response = await axios.post<CreateShopServiceResponse>(
      "/api/virtual-shop/shop-services",
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopCategories = async function (shopId: number) {
  try {
    const response = await axios.get<{ success: boolean; data: string[] }>(
      "/api/virtual-shop/shop-services/categories",
      {
        params: { shopId },
      },
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopServices = async function ({
  shopId,
  page = 1,
  limit = 10,
  search,
  category,
}: GetShopServicesParams) {
  try {
    const response = await axios.get<ShopServicesResponse>(
      "/api/virtual-shop/shop-services",
      {
        params: {
          shopId,
          page,
          limit,
          search: search || undefined,
          category: category || undefined,
        },
      },
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopBySlug = async function (slug: string) {
  try {
    const response = await axios.get<{
      success: boolean;
      data?: ShopData | null;
    }>(`/api/virtual-shop/configure/subdomain/${slug}`);

    // React Query queryFn must not resolve to undefined.
    return response.data.data || null;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
export const deleteShopService = async function (id: number) {
  try {
    const response = await axios.delete<DeleteShopServiceResponse>(
      `/api/virtual-shop/shop-services/${id}`,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateShopService = async function (
  id: number,
  payload: UpdateShopServicePayload,
) {
  try {
    const response = await axios.put<UpdateShopServiceResponse>(
      `/api/virtual-shop/shop-services/${id}`,
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopBookingSettings = async function (shopId: number) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: ShopBookingSettingsData;
    }>("/api/virtual-shop/shop-booking-settings", {
      params: { shopId },
    });

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateShopBookingSettings = async function (
  payload: UpdateShopBookingSettingsPayload,
  accessToken: string,
) {
  try {
    const response = await axios.patch<{
      success: boolean;
      data: ShopBookingSettingsData;
    }>("/api/virtual-shop/shop-booking-settings", payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getAppointmentSlots = async function (
  shopId: number,
  date?: string,
  nextAvailable?: boolean,
) {
  try {
    const response = await axios.get<AppointmentSlotsApiResponse>(
      "/api/virtual-shop/appointment-slots",
      {
        params: {
          shopId,
          date: date || undefined,
          nextAvailable: nextAvailable || undefined,
        },
      },
    );

    const payload = response.data;
    const normalizedData: AppointmentSlot[] = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.availableSlots)
        ? payload.availableSlots.map((time) => ({
            time,
            available: true,
          }))
        : [];

    return {
      success: payload.success,
      date: payload.date,
      data: normalizedData,
    } satisfies AppointmentSlotsResponse;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const createVirtualShopServiceBooking = async function (
  payload: CreateVirtualShopServiceBookingPayload,
) {
  try {
    const response = await axios.post<CreateVirtualShopServiceBookingResponse>(
      "/api/virtual-shop/service-booking",
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getGiftCardSettings = async function (accessToken: string) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardSettingsData;
    }>("/api/virtual-shop/gift-card-settings", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const createGiftCardSettings = async function (accessToken: string) {
  try {
    const response = await axios.post<{
      success: boolean;
      data: GiftCardSettingsData;
    }>(
      "/api/virtual-shop/gift-card-settings",
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateGiftCardSettings = async function (
  payload: UpdateGiftCardSettingsPayload,
  accessToken: string,
) {
  try {
    const response = await axios.patch<{
      success: boolean;
      data: GiftCardSettingsData;
    }>("/api/virtual-shop/gift-card-settings", payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getGiftCardTemplates = async function (accessToken: string) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardTemplateData[];
    }>("/api/virtual-shop/gift-card-templates", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data ?? [];
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const createGiftCardTemplate = async function (
  payload: CreateGiftCardTemplatePayload,
  accessToken: string,
) {
  try {
    const response = await axios.post<{
      success: boolean;
      data: GiftCardTemplateData;
    }>("/api/virtual-shop/gift-card-templates", payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
