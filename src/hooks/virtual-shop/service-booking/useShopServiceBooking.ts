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
      params.accessToken,
    ],
    queryFn: () => getVirtualShopServiceBookingCalendar(params),
    enabled: Boolean(
      enabled && params.accessToken && params.year && params.month,
    ),
    staleTime: 1000 * 60,
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
    staleTime: 1000 * 30,
  });
};
