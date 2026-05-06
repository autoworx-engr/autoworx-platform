"use client";

import { Button } from "@/components/ui/button";
import { Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import { useRouter } from "next/navigation";

interface BookingHeaderProps {
  rightElement?: "booking" | "giftcard";
  children?: React.ReactNode;
  onLogoClick?: () => void;
}

export const BookingHeader = ({
  rightElement,
  children,
  onLogoClick,
}: BookingHeaderProps) => {
  const { shopName: hookShopName, shop } = useShopInfo();
  const shopName = hookShopName;
  const router = useRouter();

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
      return;
    }
    if (rightElement === "giftcard") {
      router.push("/");
      return;
    }

    router.push("/");
  };

  const defaultBanner =
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000";

  return (
    <header className="relative w-full bg-background border-b overflow-hidden shadow-sm">
      {/* Reduced Height Banner */}
      <div className="relative h-28 md:h-36 w-full">
        <img
          src={shop?.bannerUrl || defaultBanner}
          alt="Shop Banner"
          className="w-full h-full object-cover"
        />
        {/* Sleek Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        {/* Floating Content Layout */}
        <div className="absolute inset-0 container max-w-5xl mx-auto px-6 flex items-center justify-between gap-6 md:gap-10">
          <button
            type="button"
            className="flex items-center gap-5 group"
            onClick={handleLogoClick}
          >
            {/* Minimalist Logo */}
            {shop?.logoUrl && (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-md shadow-xl flex items-center justify-center p-2 transform transition-transform group-hover:scale-105">
                <img
                  src={shop.logoUrl}
                  alt={shopName}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="space-y-0.5">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md">
                {shopName}
              </h1>
              {shop?.description && (
                <p className="text-[10px] md:text-xs text-white/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  {shop.description}
                </p>
              )}
            </div>
          </button>

          {/* Compact Navigation */}
          <div className="flex items-center gap-3">
            {rightElement === "giftcard" && (
              <Link href={`/gift-cards`}>
                <Button
                  size="sm"
                  className="rounded-xl gap-2 bg-white text-black hover:bg-neutral-100 transition-all font-bold shadow-lg border-none"
                >
                  <Gift className="w-4 h-4" />
                  <span className="hidden sm:inline">Gift Cards</span>
                </Button>
              </Link>
            )}

            {rightElement === "booking" && (
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 transition-all font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {children && (
        <div className="container max-w-5xl mx-auto px-6 py-2">{children}</div>
      )}
    </header>
  );
};
