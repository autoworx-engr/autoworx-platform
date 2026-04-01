"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useDeleteShop } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";

export default function ShopCard({ shop }: { shop: any }) {
  const { mutate: deleteShop, isPending } = useDeleteShop(shop?.id);

  return (
    <div className="border rounded-xl p-4 space-y-3 hover:shadow-sm transition">
      {/* Banner */}
      {shop.bannerUrl && (
        <img
          src={shop.bannerUrl}
          className="w-full h-32 object-cover rounded-lg"
        />
      )}

      {/* Info */}
      <div className="space-y-1">
        <h2 className="font-medium">{shop.storeName}</h2>
        <p className="text-xs text-gray-500 line-clamp-2">{shop.description}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/settings/virtual-shop-configure/shops/${shop.id}`}
        >
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </Link>

        <div className="flex gap-2">
          <Link
            href={`https://${shop.slug}.${process.env.NEXT_PUBLIC_APP_URL}`}
            target="_blank"
          >
            <Button variant="ghost" size="icon">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>

          <Button
            variant="destructive"
            size="icon"
            disabled={isPending}
            onClick={() => deleteShop(shop.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
