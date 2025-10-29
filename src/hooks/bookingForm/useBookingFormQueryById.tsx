import { getBookingFormById } from "@/actions/settings/bookingForm";
import { useQuery } from "@tanstack/react-query";

export default function useBookingFormQueryById(bookingId?: number) {
  return useQuery({
    queryKey: ["bookingForm"],
    queryFn: async () => {
      return getBookingFormById(bookingId!);
    },
    enabled: !!bookingId,
  });
}
