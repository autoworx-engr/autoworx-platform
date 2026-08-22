import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { TCreateShopServiceRequest } from "@/validations/schemas/virtual-shop/shop-service.validation";
import axios from "axios";

export interface ThemeConfig {
  primaryColor: string;
  fontFamily?: string;
}

export interface ShopCompanyPricing {
  tax?: number | string | null;
  serviceFee?: number | string | null;
  phone?: string | null;
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
  urgentBookingNotificationsEnabled?: boolean;
  termsConditions?: string | null;
  privacyPolicy?: string | null;
  company?: ShopCompanyPricing | null;
  bookingSettings?: ShopBookingSettingsData | null;
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
  shortDescription?: string | null;
  category: string[];
  price: number | string;
  duration: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  modifierCoupe?: number | string;
  modifierSedan?: number | string;
  modifierSUV?: number | string;
  modifierTruck?: number | string;
}

export interface UpdateShopServiceStatusResponse {
  success: boolean;
  data: {
    id: number;
    isActive: boolean;
  };
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
  giftCardCode?: string;
  depositAmount?: number;
  sessionToken?: string;
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
      taxRate?: number;
      serviceFee: number;
      serviceFeeRate?: number;
      grandTotal: number;
      giftCardRedeemed?: number;
      depositRequired?: number;
      depositPaid?: number;
      balanceDue?: number;
    };
    giftCardRedemption?: {
      code: string;
      redeemedAmount: number;
      remainingBalance: number;
    } | null;
  };
}

interface AppointmentSlotsApiResponse {
  success: boolean;
  date?: string;
  slots?: AppointmentSlot[];
  availableSlots?: string[];
  data?: AppointmentSlot[];
}

export interface VirtualShopBookingCalendarItem {
  id: number;
  status: string;
  appointment: {
    date: string;
    startTime: string | null;
    endTime: string | null;
  } | null;
  client: {
    firstName: string;
    lastName: string | null;
  } | null;
}

export interface VirtualShopServiceBookingItem {
  id: number;
  status: string;
  subtotal?: number;
  tax?: number;
  serviceFee?: number;
  total?: number;
  depositRequired?: number;
  depositPaid?: number;
  balanceDue?: number;
  appointment: {
    date: string;
    startTime: string | null;
    endTime: string | null;
  } | null;
  client: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    mobile: string | null;
  } | null;
  vehicle: {
    year: number | null;
    make: string | null;
    model: string | null;
  } | null;
  services: Array<{
    title: string;
    price: number;
    duration: number;
    modifierType: string | null;
    modifierPrice: number;
  }>;
}

export interface VirtualShopServiceBookingListResponse {
  success: boolean;
  meta: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    statusCounts?: {
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      total: number;
    };
  };
  data: VirtualShopServiceBookingItem[];
}

export type VirtualShopBookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export interface UpdateVirtualShopServiceBookingStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    status: VirtualShopBookingStatus;
  };
}

export type GetVirtualShopServiceBookingCalendarParams = {
  year: number;
  month:
    | "january"
    | "february"
    | "march"
    | "april"
    | "may"
    | "june"
    | "july"
    | "august"
    | "september"
    | "october"
    | "november"
    | "december";
  accessToken: string;
};

export type GetVirtualShopServiceBookingsParams = {
  accessToken: string;
  page?: number;
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
  search?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  sortOrder?: "asc" | "desc";
};

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
  shopId: number;
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
  shopId: number;
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

export type UpdateGiftCardTemplatePayload =
  Partial<CreateGiftCardTemplatePayload>;

export type GiftCardPromoType = "Percentage" | "Fixed";

export interface GiftCardPromoData {
  id: number;
  companyId: number;
  shopId: number;
  code: string;
  type: GiftCardPromoType;
  value: number | string;
  startDate: string;
  expireDate: string | null;
  usageLimit: number | null;
  timesUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGiftCardPromoPayload {
  code: string;
  type: GiftCardPromoType;
  value: number;
  startDate?: string | null;
  expireDate?: string | null;
  usageLimit?: number | null;
  isActive?: boolean;
}

export type UpdateGiftCardPromoPayload = Partial<CreateGiftCardPromoPayload>;

export const configureVirtualShop = async function (payload: ShopData) {
  try {
    const response = await axios.post(`/api/virtual-shop/configure`, payload);

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopById = async function (id?: number) {
  try {
    const response = await axios.get(`/api/virtual-shop/configure/${id}`);

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getShopsByCompanyId = async function (companyId: number) {
  try {
    const response = await axios.get(
      `/api/virtual-shop/configure/company/${companyId}`,
    );

    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateShopConfigure = async function (
  payload: ShopData,
  id?: number,
) {
  try {
    const response = await axios.patch(
      `/api/virtual-shop/configure/${id}`,
      payload,
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
export const deleteShopConfigure = async function (id: number) {
  try {
    const response = await axios.delete(`/api/virtual-shop/configure/${id}`);

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

export const updateShopServiceStatus = async function (
  id: number,
  isActive: boolean,
) {
  try {
    const response = await axios.patch<UpdateShopServiceStatusResponse>(
      `/api/virtual-shop/shop-services/${id}/status`,
      { isActive },
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
  duration?: number,
) {
  try {
    const response = await axios.get<AppointmentSlotsApiResponse>(
      "/api/virtual-shop/appointment-slots",
      {
        params: {
          shopId,
          date: date || undefined,
          nextAvailable: nextAvailable || undefined,
          duration: duration || undefined,
        },
      },
    );

    const payload = response.data;
    const normalizedData: AppointmentSlot[] = Array.isArray(payload.slots)
      ? payload.slots
      : Array.isArray(payload.data)
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

export const lookupClientByPhone = async function ({
  phone,
  shopId,
}: {
  phone: string;
  shopId: number;
}) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
        Vehicle: {
          id: number;
          year: number | null;
          make: string | null;
          model: string | null;
        }[];
      } | null;
    }>("/api/virtual-shop/client-lookup/by-phone", {
      params: { phone, shopId },
    });

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getVirtualShopServiceBookingCalendar = async function ({
  year,
  month,
  accessToken,
}: GetVirtualShopServiceBookingCalendarParams) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: VirtualShopBookingCalendarItem[];
    }>("/api/virtual-shop/service-booking/calendar", {
      params: {
        year,
        month,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getVirtualShopServiceBookings = async function ({
  accessToken,
  page = 1,
  limit = 10,
  date,
  startDate,
  endDate,
  year,
  month,
  search,
  status,
  sortOrder = "desc",
}: GetVirtualShopServiceBookingsParams) {
  try {
    const response = await axios.get<VirtualShopServiceBookingListResponse>(
      "/api/virtual-shop/service-booking",
      {
        params: {
          page,
          limit,
          date: date || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          year: year || undefined,
          month: month || undefined,
          search: search || undefined,
          status: status || undefined,
          sortOrder,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateVirtualShopServiceBookingStatus = async function (
  id: number,
  status: VirtualShopBookingStatus,
) {
  try {
    const response =
      await axios.patch<UpdateVirtualShopServiceBookingStatusResponse>(
        `/api/virtual-shop/service-booking/${id}/status`,
        { status },
      );

    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getGiftCardSettings = async function (
  shopId: number,
  accessToken: string,
) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardSettingsData;
    }>("/api/virtual-shop/gift-card-settings", {
      params: { shopId },
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

export const createGiftCardSettings = async function (
  shopId: number,
  accessToken: string,
) {
  try {
    const response = await axios.post<{
      success: boolean;
      data: GiftCardSettingsData;
    }>(
      "/api/virtual-shop/gift-card-settings",
      { shopId },
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
  shopId: number,
  payload: UpdateGiftCardSettingsPayload,
  accessToken: string,
) {
  try {
    const response = await axios.patch<{
      success: boolean;
      data: GiftCardSettingsData;
    }>(
      "/api/virtual-shop/gift-card-settings",
      { shopId, ...payload },
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

export const getGiftCardTemplates = async function (
  shopId: number,
  accessToken: string,
) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardTemplateData[];
    }>("/api/virtual-shop/gift-card-templates", {
      params: { shopId },
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
  shopId: number,
  payload: CreateGiftCardTemplatePayload,
  accessToken: string,
) {
  try {
    const response = await axios.post<{
      success: boolean;
      data: GiftCardTemplateData;
    }>(
      "/api/virtual-shop/gift-card-templates",
      { shopId, ...payload },
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

export const updateGiftCardTemplate = async function (
  id: number,
  payload: UpdateGiftCardTemplatePayload,
  accessToken: string,
) {
  try {
    const response = await axios.patch<{
      success: boolean;
      data: GiftCardTemplateData;
    }>(`/api/virtual-shop/gift-card-templates/${id}`, payload, {
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

export const getGiftCardTemplatesPublic = async function (shopId: number) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardTemplateData[];
    }>("/api/virtual-shop/gift-card-templates/public", {
      params: { shopId },
    });

    return response.data?.data ?? [];
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getGiftCardSettingsByShopId = async function (shopId: number) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardSettingsData;
    }>("/api/virtual-shop/gift-card-settings", {
      params: { shopId },
    });
    return response.data?.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export interface BuyGiftCardPayload {
  shopId: number;
  templateId: number;
  purchaseType: string;
  amount: number;
  promoCode?: string;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string;
  isSendToMyself: boolean;
  deliveryMethod?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  scheduledSendAt?: string;
  message?: string;
}

export const buyGiftCard = async function (payload: BuyGiftCardPayload) {
  try {
    const response = await axios.post<{
      success: boolean;
      message?: string;
      data: any;
    }>("/api/virtual-shop/buy-gift-card", payload);
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const deleteGiftCardTemplate = async function (
  id: number,
  accessToken: string,
) {
  try {
    await axios.delete(`/api/virtual-shop/gift-card-templates/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return true;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getGiftCardPromos = async function (
  shopId: number,
  accessToken: string,
) {
  try {
    const response = await axios.get<{
      success: boolean;
      data: GiftCardPromoData[];
    }>("/api/virtual-shop/gift-card-promos", {
      params: { shopId },
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

export const createGiftCardPromo = async function (
  shopId: number,
  payload: CreateGiftCardPromoPayload,
  accessToken: string,
) {
  try {
    const response = await axios.post<{
      success: boolean;
      data: GiftCardPromoData;
    }>(
      "/api/virtual-shop/gift-card-promos",
      { shopId, ...payload },
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

export const updateGiftCardPromo = async function (
  id: number,
  payload: UpdateGiftCardPromoPayload,
  accessToken: string,
) {
  try {
    const response = await axios.patch<{
      success: boolean;
      data: GiftCardPromoData;
    }>(`/api/virtual-shop/gift-card-promos/${id}`, payload, {
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

export const deleteGiftCardPromo = async function (
  id: number,
  accessToken: string,
) {
  try {
    await axios.delete(`/api/virtual-shop/gift-card-promos/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return true;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

// --- Urgent (Emergency) Service Requests ---

export type EmergencyRequestStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "ALTERNATIVE_PROPOSED"
  | "CLIENT_CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface UrgentRequestClient {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  mobile: string | null;
}

export interface UrgentRequestVehicle {
  id: number;
  make: string;
  model: string;
  year: number;
}

export interface UrgentRequestShop {
  id: number;
  storeName: string;
  slug?: string;
}

export interface UrgentRequestReviewer {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

export interface UrgentRequest {
  id: number;
  shopId: number;
  clientId: number | null;
  vehicleId: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  requestedServices: any;
  requestedDate: string | null;
  requestedTime: string | null;
  flexibleTiming: boolean;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  status: EmergencyRequestStatus;
  priority: number;
  reviewedAt: string | null;
  reviewedBy: number | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  proposedDate: string | null;
  proposedTime: string | null;
  alternativeNotes: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  client: UrgentRequestClient | null;
  vehicle: UrgentRequestVehicle | null;
  shop: UrgentRequestShop;
  reviewer: UrgentRequestReviewer | null;
}

export interface UrgentRequestsListResponse {
  success: boolean;
  data: UrgentRequest[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UrgentRequestDetailResponse {
  success: boolean;
  data: UrgentRequest;
}

export type UpdateUrgentRequestPayload = {
  status?: EmergencyRequestStatus;
  adminNotes?: string;
  rejectionReason?: string;
  proposedDate?: string | null;
  proposedTime?: string | null;
  alternativeNotes?: string | null;
};

export const getUrgentRequests = async (
  params: {
    shopId?: number;
    status?: EmergencyRequestStatus;
    page?: number;
    limit?: number;
  },
  accessToken: string,
): Promise<UrgentRequestsListResponse> => {
  try {
    const response = await axios.get<UrgentRequestsListResponse>(
      "/api/virtual-shop/emergency-requests",
      {
        params,
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const getUrgentRequestById = async (
  id: number,
  accessToken: string,
): Promise<UrgentRequest> => {
  try {
    const response = await axios.get<UrgentRequestDetailResponse>(
      `/api/virtual-shop/emergency-requests/${id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return response.data.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};

export const updateUrgentRequest = async (
  id: number,
  payload: UpdateUrgentRequestPayload,
  accessToken: string,
): Promise<UrgentRequest> => {
  try {
    const response = await axios.patch<UrgentRequestDetailResponse>(
      `/api/virtual-shop/emergency-requests/${id}`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return response.data.data;
  } catch (error) {
    const err = errorHandler(error);
    throw err;
  }
};
