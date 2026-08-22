"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { ProgressBar } from "./ProgressBar";
import { ServiceMenu } from "./ServiceMenu";
import { DateTimeSelection } from "./DateTimeSelection";
import { Checkout } from "./Checkout";
import { Confirmation } from "./Confirmation";
import { CartDrawer } from "./CartDrawer";
import { BookingHeader } from "./BookingHeader";
import { EmergencyRequestModal } from "./EmergencyRequestModal";
import { useShopInfo } from "@/hooks/virtual-shop/useShopInfo";
import ShopNotFound from "../giftcards/ShopNotFound";
import {
  useGetShopCategories,
  useGetShopServices,
} from "@/hooks/virtual-shop/service/useShopService";
import { Service } from "../../data/types";
import { useShopBranding } from "../../hooks/useShopBranding";
import { Spinner } from "../ui/Spinner";
import { CheckoutV1 } from "./CheckoutV1";

const SERVICES_PER_PAGE = 10;

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const BookingContent = ({ initialShop }: { initialShop?: any }) => {
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [hasNoSlots, setHasNoSlots] = useState(false);
  const {
    step,
    setStep,
    resetBooking,
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
  const searchParams = useSearchParams();

  useEffect(() => {
    const isPaymentReturn =
      searchParams.get("success") === "true" ||
      searchParams.get("cancel") === "true";

    if (isPaymentReturn && step !== "checkout" && step !== "confirmation") {
      setStep("checkout");
    }
  }, [searchParams, step, setStep]);
  const {
    shop,
    isPending: isShopLoading,
    isError: isShopError,
  } = useShopInfo(initialShop);

  // Apply dynamic shop branding (Colors & Fonts)
  useShopBranding(initialShop);

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
      const { totalPages, hasNextPage, hasPrevPage } = shopServices.meta;
      setTotalPages(totalPages);
      setHasNextPage(hasNextPage);
      setHasPrevPage(hasPrevPage);
    }
  }, [setHasNextPage, setHasPrevPage, setTotalPages, shopServices?.meta]);

  useEffect(() => {
    if (step !== "datetime") setHasNoSlots(false);
  }, [step]);

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
      shortDescription: svc.shortDescription || undefined,
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Spinner size={40} />
        <p className="mt-4 text-muted-foreground animate-pulse text-sm font-medium">
          Loading Shop Information...
        </p>
      </div>
    );
  }

  if ((!shop && !isShopLoading) || shop?.isActive === false) {
    return <ShopNotFound />;
  }

  const handleLogoClick = () => {
    resetBooking();
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-sm">
      {/* Header */}
      <BookingHeader rightElement="giftcard" onLogoClick={handleLogoClick}>
        <ProgressBar current={step} />
      </BookingHeader>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8 relative">
        {step === "services" && <ServiceMenu isLoading={isServicesLoading} />}
        {step === "datetime" && (
          <DateTimeSelection
            onAvailabilityChange={(hasSlots) => setHasNoSlots(!hasSlots)}
            onEmergencyRequest={() => setIsEmergencyModalOpen(true)}
          />
        )}
        {step === "checkout" && <Checkout />}
        {step === "confirmation" && <Confirmation />}
      </main>

      {/* Cart FAB */}
      {step === "services" && <CartDrawer />}

      {/* Emergency Request Modal */}
      <EmergencyRequestModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
};

export default BookingContent;
