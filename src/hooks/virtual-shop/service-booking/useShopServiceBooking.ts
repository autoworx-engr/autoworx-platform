import {
  GetVirtualShopServiceBookingCalendarParams,
  GetVirtualShopServiceBookingsParams,
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
  enabled = true,
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
      params.sortOrder,
      params.accessToken,
    ],
    queryFn: () => getVirtualShopServiceBookings(params),
    enabled: Boolean(enabled && params.accessToken),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
