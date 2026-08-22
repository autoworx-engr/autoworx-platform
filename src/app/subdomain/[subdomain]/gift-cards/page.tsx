import { getShopBySlugServer } from "@/service/virtual-shop/server-api";
import GiftCardsPage from "../pages/GiftCardsPage";
import { Metadata } from "next";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const shop = await getShopBySlugServer(params.subdomain);

  if (!shop) {
    return {
      title: "Gift Cards | Shop Not Found",
    };
  }

  return {
    title: `Buy Gift Cards - ${shop.storeName}`,
    description: `Purchase gift cards from ${shop.storeName} online.`,
    openGraph: {
      title: `Gift Cards | ${shop.storeName}`,
      description: `Get a gift card for ${shop.storeName} today.`,
      images: shop.logoUrl ? [shop.logoUrl] : [],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const shop = await getShopBySlugServer(params.subdomain);
  return <GiftCardsPage initialShop={shop} />;
}
