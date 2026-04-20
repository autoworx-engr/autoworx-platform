import { useParams } from "next/navigation";
import { useGetShopBySlug } from "./service/useShopService";

export const useShopInfo = (initialData?: any) => {
  const params = useParams();
  const subdomain = params?.subdomain;
  const slug = String(subdomain || "");

  const {
    data: shop,
    isPending,
    isError,
  } = useGetShopBySlug(slug, initialData);

  return {
    shop,
    isPending,
    isError,
    shopName: shop?.storeName || "ABC Business",
    companyId: shop?.companyId,
    shopId: shop?.id,
  };
};
