"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useDeleteShop } from "@/hooks/virtual-shop/configure/useVirtualShopConfigure";
import Image from "next/image";
import { Popconfirm } from "antd";

const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;

export default function ShopCard({ shop }: { shop: any }) {
  const { mutate: deleteShop, isPending } = useDeleteShop(
    shop?.id,
    shop?.companyId,
  );

  return (
    <div className="border rounded-xl p-4 space-y-3 hover:shadow-sm transition">
      {/* Banner */}
      {shop.bannerUrl && (
        <Image
          src={shop.bannerUrl}
          alt={shop?.storeName}
          className="w-full h-32 object-cover rounded-lg"
          width={400}
          height={400}
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
            href={`${window.location.protocol}//${slug}.${domain}${window.location.port ? ":" + window.location.port : ""}`}
            target="_blank"
          >
            <Button variant="ghost" size="icon">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>

          <Popconfirm
            title="Delete the shop"
            description="Are you sure to delete this shop?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => deleteShop(shop.id)}
          >
            <button
              className="flex items-center gap-1 px-2 text-xs rounded-md border border-red-300 text-red-500 hover:bg-red-50"
              disabled={isPending}
            >
              <Trash2 size={14} />
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}
