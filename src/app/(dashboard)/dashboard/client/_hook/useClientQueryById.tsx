import getSingleClient from "@/actions/client/getSingleClient";
import { useQuery } from "@tanstack/react-query";

export const CLIENT_DETAIL_KEY = "client-detail";

export default function useClientByIdQuery(id: number) {
  return useQuery({
    queryKey: [CLIENT_DETAIL_KEY, id],
    queryFn: () => getSingleClient(id),
    enabled: !!id,
  });
}
