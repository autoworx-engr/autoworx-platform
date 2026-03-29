"use client";

import { useEffect } from "react";
import { useBooking } from "../../context/BookingContext";
import { ProgressBar } from "./ProgressBar";
import { ServiceMenu } from "./ServiceMenu";
import { DateTimeSelection } from "./DateTimeSelection";
import { Checkout } from "./Checkout";
import { Confirmation } from "./Confirmation";
import { CartDrawer } from "./CartDrawer";
import { BookingHeader } from "./BookingHeader";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import ShopNotFound from "../giftcards/ShopNotFound";
import { useGetShopCategories } from "@/hooks/virtual-shop/service/useShopService";
import { useGetShopServices } from "@/hooks/virtual-shop/service/useShopService";
import CarLoading from "@/components/common/CarLoading";
import { Service } from "../../data/types";

const SERVICES_PER_PAGE = 10;

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const BookingContent = ({ initialShop }: { initialShop?: any }) => {
  const {
    step,
    setServices,
    currentPage,
    setCurrentPage,
    setTotalPages,
    setHasNextPage,
    setHasPrevPage,
    categories: contextCategories,
    setCategories,
    selectedCategory,
  } = useBooking();
  const {
    shop,
    isPending: isShopLoading,
    isError: isShopError,
  } = useShopInfo(initialShop);

  // Apply Dynamic Styles from Shop Info
  useEffect(() => {
    if (shop) {
      const { themeConfig } = shop;
      const root = document.documentElement;

      const hexToHsl = (hex: string) => {
        let r = 0,
          g = 0,
          b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
        }
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
        let h = 0,
          s = 0,
          l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      if (themeConfig?.primaryColor) {
        const hslValue = hexToHsl(themeConfig.primaryColor);
        root.style.setProperty("--primary", hslValue);
      }

      const banner = shop.bannerUrl || "/images/landing/booking-hero.png";
      root.style.setProperty("--shop-banner", `url(${banner})`);

      if (themeConfig?.fontFamily) {
        const fontName = themeConfig.fontFamily;
        const linkId = "dynamic-google-font";
        let linkElement = document.getElementById(linkId) as HTMLLinkElement;

        if (!linkElement) {
          linkElement = document.createElement("link");
          linkElement.id = linkId;
          linkElement.rel = "stylesheet";
          document.head.appendChild(linkElement);
        }

        const formattedFontName = fontName.replace(/\s+/g, "+");
        linkElement.href = `https://fonts.googleapis.com/css2?family=${formattedFontName}:wght@300;400;500;700;900&display=swap`;

        document.body.style.fontFamily = `"${fontName}", sans-serif`;
      }
    }
  }, [shop]);

  // Fetch categories from API
  const { data: categoriesData } = useGetShopCategories(shop?.id);

  // Sync categories to context when they arrive (if empty, show All)
  useEffect(() => {
    if (categoriesData?.data && categoriesData.data.length > 0) {
      setCategories(categoriesData.data);
    }
  }, [categoriesData, setCategories]);

  const {
    data: shopServices,
    isPending: isServicesLoading,
    isError: isServicesError,
  } = useGetShopServices({
    shopId: shop?.id,
    page: currentPage,
    limit: SERVICES_PER_PAGE,
    category: selectedCategory === "All" ? undefined : selectedCategory,
  });

  // Sync pagination metadata to context
  useEffect(() => {
    if (shopServices?.meta) {
      setTotalPages(shopServices.meta.totalPages);
      setHasNextPage(shopServices.meta.hasNextPage);
      setHasPrevPage(shopServices.meta.hasPrevPage);
    }
  }, [shopServices?.meta, setTotalPages, setHasNextPage, setHasPrevPage]);

  // Map and sync services to context
  useEffect(() => {
    if (isShopError || isServicesError || !shop?.id) {
      setServices([]);
      return;
    }

    if (!shopServices?.data) {
      return;
    }

    const mapped: Service[] = shopServices.data.map((svc) => ({
      id: String(svc.id),
      title: svc.title,
      description: svc.description || "",
      price: toNumber(svc.price),
      estimatedMinutes: svc.duration,
      category: svc.category && svc.category.length > 0 ? svc.category[0] : "",
      images: svc.imageUrl ? [svc.imageUrl] : [""],
      vehicleTypePricing: {
        coupe: toNumber(svc.modifierCoupe),
        sedan: toNumber(svc.modifierSedan),
        suv: toNumber(svc.modifierSUV),
        truck: toNumber(svc.modifierTruck),
      },
    }));

    setServices(mapped);
  }, [shopServices, setServices, isShopError, isServicesError, shop?.id]);

  if (isShopLoading && !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CarLoading />
      </div>
    );
  }

  if (!shop && !isShopLoading) {
    return <ShopNotFound />;
  }

  return (
    <div className="min-h-screen bg-background text-sm">
      {/* Header */}
      <BookingHeader rightElement="giftcard">
        <ProgressBar current={step} />
      </BookingHeader>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8 relative">
        {step === "services" &&
          (isServicesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
              <CarLoading />
              <p className="text-muted-foreground mt-4 animate-pulse">
                Loading available services...
              </p>
            </div>
          ) : (
            <ServiceMenu />
          ))}
        {step === "datetime" && <DateTimeSelection />}
        {step === "checkout" && <Checkout />}
        {step === "confirmation" && <Confirmation />}
      </main>

      {/* Cart FAB */}
      {step === "services" && <CartDrawer />}
    </div>
  );
};

export default BookingContent;
