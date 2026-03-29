"use client";

import { Button } from "@/components/ui/button";
import { Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";

interface BookingHeaderProps {
  rightElement?: "booking" | "giftcard";
  children?: React.ReactNode;
}

export const BookingHeader = ({
  rightElement,
  children,
}: BookingHeaderProps) => {
  const { shopName: hookShopName, shop } = useShopInfo();
  const shopName = hookShopName;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={shop?.logoUrl || "/icons/Logo.png"}
            alt={shopName}
            className="w-10 h-10 rounded-lg object-contain bg-muted p-1"
          />
          <div>
            <span className="font-bold text-lg tracking-tight leading-tight block">
              {shopName}
            </span>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {shop?.address || "Auto Repair & Services"}
            </p>
          </div>
        </div>

        {rightElement === "giftcard" && (
          <Link href={`/gift-cards`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Gift Cards
            </Button>
          </Link>
        )}

        {rightElement === "booking" && (
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Booking
            </Button>
          </Link>
        )}
      </div>
      {children && (
        <div className="container max-w-5xl mx-auto px-4 pb-3">{children}</div>
      )}
    </header>
  );
};
