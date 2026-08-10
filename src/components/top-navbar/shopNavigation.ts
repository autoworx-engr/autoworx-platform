export type ShopOption = {
  id: number;
  storeName: string;
  logoUrl?: string;
  slug?: string;
};

export function normalizeShops(data: unknown): ShopOption[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter(
      (
        shop,
      ): shop is {
        id: number;
        storeName: string;
        logoUrl?: string | null;
        slug?: string | null;
      } =>
        Number.isFinite(Number((shop as { id?: unknown })?.id)) &&
        typeof (shop as { storeName?: unknown })?.storeName === "string",
    )
    .map((shop) => ({
      id: Number(shop.id),
      storeName: shop.storeName,
      logoUrl: typeof shop.logoUrl === "string" ? shop.logoUrl : undefined,
      slug: typeof shop.slug === "string" ? shop.slug : undefined,
    }));
}

export function getShopAdminRedirectPath(shopId: number): string {
  return `/dashboard/virtual-shop/admin/${shopId}/services`;
}
