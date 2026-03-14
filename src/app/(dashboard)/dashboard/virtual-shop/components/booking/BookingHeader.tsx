"use client";

import { Button } from "@/components/ui/button";
import { Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface BookingHeaderProps {
  shopName?: string;
  phone?: string;
  address?: string;
  rightElement?: "booking" | "giftcard";
  children?: React.ReactNode;
}

export const BookingHeader = ({
  shopName = "ABC Business",
  phone = "(555) 123-4567",
  address = "123 Main St, Springfield",
  rightElement,
  children,
}: BookingHeaderProps) => {
  const { shopId } = useParams();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={"/icons/Logo.png"}
            alt="AutoWorx"
            className="w-9 h-9 rounded-lg object-cover"
          />
          <div>
            <span
              className="font-bold text-lg tracking-tight leading-tight block"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {shopName}
            </span>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {phone} · {address}
            </p>
          </div>
        </div>

        {rightElement === "giftcard" && (
          <Link
            href={`/dashboard/virtualization/gift-cards/${shopId || "demo"}`}
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Gift Cards
            </Button>
          </Link>
        )}

        {rightElement === "booking" && (
          <Link href={`/dashboard/virtualization`}>
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
