"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink, ImageOff, Pencil, Store, Trash2 } from "lucide-react";
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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      {/* Banner */}
      {shop.bannerUrl ? (
        <Image
          src={shop.bannerUrl}
          alt={shop?.storeName}
          className="h-36 w-full rounded-xl object-cover sm:h-40"
          width={400}
          height={400}
        />
      ) : (
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 sm:h-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.16),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(148,163,184,0.12),transparent_40%)]" />
          <div className="relative z-10 flex flex-col items-center gap-2 text-slate-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <p className="flex items-center gap-1 text-xs font-medium">
              <ImageOff className="h-3.5 w-3.5" />
              No banner image
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            {shop.logoUrl ? (
              <Image
                src={shop.logoUrl}
                alt={`${shop?.storeName} logo`}
                className="h-full w-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <Store className="h-4 w-4" />
              </div>
            )}
          </div>

          <h2 className="text-lg font-semibold text-slate-700">
            {shop.storeName}
          </h2>
        </div>
        <p className="line-clamp-2 text-xs text-slate-500">
          {shop.description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/settings/virtual-shop-configure/shops/${shop.id}`}
        >
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`${window.location.protocol}//${shop?.slug}.${domain}${window.location.port ? ":" + window.location.port : ""}`}
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
            overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
            okButtonProps={{
              className:
                "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
            }}
            cancelButtonProps={{
              className:
                "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
            }}
          >
            <button
              className="flex h-9 items-center gap-1 rounded-md border border-red-300 px-2 text-xs text-red-500 transition-colors hover:bg-red-50"
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
