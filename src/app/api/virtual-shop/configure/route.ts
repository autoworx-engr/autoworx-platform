import { db } from "@/lib/db";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "POST") {
      const { storeName, slug, description, logoUrl, bannerUrl, themeConfig } =
        req.body;

      // Check if slug exists
      const existing = await db.shop.findUnique({ where: { slug } });
      if (existing)
        return res.status(400).json({ error: "Slug already exists" });

      const shop = await db.shop.create({
        data: {
          companyId: 1, // Replace with actual company id from session
          storeName,
          slug,
          description,
          logoUrl,
          bannerUrl,
          themeConfig,
        },
      });

      return res.status(200).json(shop);
    }

    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
