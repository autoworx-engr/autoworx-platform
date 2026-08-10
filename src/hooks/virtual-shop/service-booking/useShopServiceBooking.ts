import {
  GetVirtualShopServiceBookingCalendarParams,
  GetVirtualShopServiceBookingsParams,
  VirtualShopServiceBookingListResponse,
  getVirtualShopServiceBookingCalendar,
  getVirtualShopServiceBookings,
} from "@/service/virtual-shop/api";
import { useQuery } from "@tanstack/react-query";

export const useGetVirtualShopServiceBookingCalendar = (
  params: GetVirtualShopServiceBookingCalendarParams,
  enabled = true,
) => {
  return useQuery({
    queryKey: [
      "virtual-shop-service-booking-calendar",
      params.year,
      params.month,
    ],
    queryFn: () => getVirtualShopServiceBookingCalendar(params),
    enabled: Boolean(enabled && params.year && params.month),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useGetVirtualShopServiceBookings = (
  params: GetVirtualShopServiceBookingsParams,
  options?: {
    enabled?: boolean;
    initialData?: VirtualShopServiceBookingListResponse;
  },
) => {
  return useQuery({
    queryKey: [
      "virtual-shop-service-bookings",
      params.date,
      params.year,
      params.month,
      params.page,
      params.limit,
      params.search,
      params.status,
      params.startDate,
      params.endDate,
      params.sortOrder,
      params.accessToken,
    ],
    queryFn: () => getVirtualShopServiceBookings(params),
    enabled: Boolean((options?.enabled ?? true) && params.accessToken),
    initialData: options?.initialData,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
