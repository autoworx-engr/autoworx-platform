import { getBooking } from "@/actions/settings/bookingForm";
import { useQuery } from "@tanstack/react-query";

export default function useBookingFormQuery(companyId?: number) {
  return useQuery({
    queryKey: ["bookingForm"],
    queryFn: async () => {
      return getBooking(companyId!);
    },
    enabled: !!companyId,
  });
}
