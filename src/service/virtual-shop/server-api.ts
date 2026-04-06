import { db } from "@/lib/db";
import { cache } from "react";

export const getShopBySlugServer = cache(async (slug: string) => {
  if (!slug) return null;

  try {
    const shop = await db.shop.findUnique({
      where: { slug },
      include: {
        bookingSettings: true,
        company: {
          select: {
            tax: true,
            serviceFee: true,
          },
        },
      },
    });

    return shop;
  } catch (error) {
    console.error("Error fetching shop by slug on server:", error);
    return null;
  }
});
