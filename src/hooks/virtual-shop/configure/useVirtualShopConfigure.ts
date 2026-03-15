// hooks/useVirtualShop.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as shopService from "@/service/virtual-shop/api";

/**
 * Fetch all shops or a single shop by ID
 * @param id Optional shop ID
 */
export const useGetShops = (id?: number) => {
  return useQuery({
    queryKey: ["virtual-shop", id ?? "all"],
    queryFn: () => shopService.getShops(id),
    enabled: !!id || id === undefined,
    staleTime: 1000 * 60, // 1 minute cache
  });
};

/**
 * Create a new virtual shop
 */
export const useCreateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopService.createShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-shop"] });
    },
  });
};

/**
 * Update an existing virtual shop
 */
export const useUpdateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopService.updateShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-shop"] });
    },
  });
};

/**
 * Delete a virtual shop
 */
export const useDeleteShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopService.deleteShop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["virtual-shop"] });
    },
  });
};

/**
 * Check if a slug is available
 * @param slug Shop slug to check
 */
export const useCheckSlug = (slug: string) => {
  return useQuery({
    queryKey: ["virtual-shop-slug", slug],
    queryFn: () => shopService.checkSlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60, // cache for 1 minute
  });
};
