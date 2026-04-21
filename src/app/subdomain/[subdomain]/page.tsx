import { getShopBySlugServer } from "@/service/virtual-shop/server-api";
import BookingPage from "./pages/BookingPage";
import { Metadata } from "next";

type Props = {
  params: { subdomain: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await getShopBySlugServer(params.subdomain);

  if (!shop || shop.isActive === false) {
    return {
      title: "Shop Not Found | Autoworx",
    };
  }

  return {
    title: `${shop.storeName} | Online Booking`,
    description:
      shop.description || `Book services from ${shop.storeName} online.`,
    openGraph: {
      title: shop.storeName,
      description: shop.description || "",
      images: shop.logoUrl ? [shop.logoUrl] : [],
    },
  };
}

export default async function VirtualShop({ params }: Props) {
  const shop = await getShopBySlugServer(params.subdomain);

  return (
    <div>
      <BookingPage initialShop={shop} />
    </div>
  );
}
