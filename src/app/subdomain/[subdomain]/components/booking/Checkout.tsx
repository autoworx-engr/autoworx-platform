import { useCallback, useEffect, useRef, useState } from "react";
import { getPaymentGatewayInfo } from "@/app/(dashboard)/dashboard/settings/payments/getPaymentGatewayInfo";
import { PayNow } from "@/components/invoice-modal/PayNow";
import { useServerGet } from "@/hooks/useServerGet";
import {
  useCreateVirtualShopServiceBooking,
  useGetShopBySlug,
  useLookupClientByPhone,
} from "@/hooks/virtual-shop/service/useShopService";
import { errorToast, successToast } from "@/lib/toast";
import axios from "axios";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ExistingVehicle } from "./CheckoutVehicleSection";
import { useBooking } from "../../context/BookingContext";
import { BookingTotals, CartItem, CustomerInfo } from "../../data/types";
import { CheckoutHeader } from "./checkout/CheckoutHeader";
import { BookingSummaryCard } from "./checkout/BookingSummaryCard";
import { GiftCardSection } from "./checkout/GiftCardSection";
import { PendingDepositBanner } from "./checkout/PendingDepositBanner";
import { TimerExpiredDialog } from "./checkout/TimerExpiredDialog";
import { CustomerForm } from "./checkout/CustomerForm";
import { useCheckoutTimer } from "./checkout/useCheckoutTimer";
import { useGiftCard } from "./checkout/useGiftCard";
import { useCheckoutTotals } from "./checkout/useCheckoutTotals";
import { isValidEmail, normalizePhone } from "./checkout/checkoutUtils";

export const Checkout = () => {
  const {
    setStep,
    cart,
    addToCart,
    cartDurationMinutes,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    setCustomerInfo,
    bookingTotals,
    setBookingTotals,
    setEstimateId,
    setIsReturningClient,
    settings,
    sessionToken,
  } = useBooking();

  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const slug = String(params?.subdomain || "");
  const { data: shop } = useGetShopBySlug(slug);
  const { data: gatewayInfo } = useServerGet(
    getPaymentGatewayInfo,
    Number(shop?.companyId),
  );
  const { mutateAsync: createBooking, isPending: isBookingSubmitting } =
    useCreateVirtualShopServiceBooking();
  const { mutateAsync: lookupClient, isPending: isLookingUp } =
    useLookupClientByPhone();

  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isResolvingBookingReturn, setIsResolvingBookingReturn] =
    useState(false);
  const [serverDepositRequired, setServerDepositRequired] = useState<
    number | null
  >(null);
  const [payableDepositAmount, setPayableDepositAmount] = useState<
    number | null
  >(null);
  const [existingVehicles, setExistingVehicles] = useState<ExistingVehicle[]>(
    [],
  );
  const hasHandledStripeReturn = useRef(false);
  const [form, setForm] = useState<CustomerInfo>({
    fullName: "",
    email: "",
    phone: "",
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    notes: "",
  });

  const { timeLeft, timerExpired, formatTime, handleAddTime } =
    useCheckoutTimer({
      shopId: shop?.id,
      sessionToken,
      selectedDate,
      selectedSlot,
      cartDurationMinutes,
    });
  const {
    giftCardCode,
    setGiftCardCode,
    isApplyingGiftCard,
    giftCardError,
    appliedGiftCard,
    handleApplyGiftCard,
    clearAppliedGiftCard,
  } = useGiftCard({ shopId: shop?.id });

  const totals = useCheckoutTotals({
    cart,
    bookingSettings: shop?.bookingSettings,
    companyTax: shop?.company?.tax,
    companyServiceFee: shop?.company?.serviceFee,
    settings,
    appliedGiftCard,
    serverDepositRequired,
    createdBookingId,
  });

  const releaseHold = useCallback(() => {
    if (!shop?.id || !sessionToken) return;
    fetch("/api/virtual-shop/service-booking/hold", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, sessionToken }),
      keepalive: true,
    }).catch(() => {});
  }, [shop?.id, sessionToken]);

  useEffect(() => {
    const handleUnload = () => {
      if (!shop?.id || !sessionToken) return;
      fetch("/api/virtual-shop/service-booking/hold", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, sessionToken }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [shop?.id, sessionToken]);

  const clearPaymentQueryParams = useCallback(() => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete("success");
    query.delete("cancel");
    const queryString = query.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}${window.location.hash}`;
    router.replace(nextUrl);
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams.get("cancel") !== "true") return;
    setIsResolvingBookingReturn(true);
    errorToast("Payment was cancelled. Your booking is still pending.");
    clearPaymentQueryParams();
    setIsResolvingBookingReturn(false);
  }, [searchParams, clearPaymentQueryParams]);

  useEffect(() => {
    if (hasHandledStripeReturn.current) return;
    if (searchParams.get("success") !== "true") return;
    hasHandledStripeReturn.current = true;
    setIsResolvingBookingReturn(true);
    const raw = sessionStorage.getItem("virtualShopPendingBooking");
    if (!raw) {
      setStep("confirmation");
      successToast("Payment successful!");
      clearPaymentQueryParams();
      setIsResolvingBookingReturn(false);
      return;
    }
    try {
      const snapshot = JSON.parse(raw) as {
        bookingId?: string;
        selectedDate?: string;
        selectedSlot?: any;
        customerInfo?: CustomerInfo;
        bookingTotals?: BookingTotals;
        depositRequired?: number;
        cart?: CartItem[];
      };
      if (snapshot.bookingId) setCreatedBookingId(snapshot.bookingId);
      if (snapshot.selectedDate)
        setSelectedDate(new Date(snapshot.selectedDate));
      if (snapshot.selectedSlot) setSelectedSlot(snapshot.selectedSlot);
      if (snapshot.customerInfo) setCustomerInfo(snapshot.customerInfo);
      if (snapshot.bookingTotals) setBookingTotals(snapshot.bookingTotals);
      if (typeof snapshot.depositRequired === "number")
        setServerDepositRequired(snapshot.depositRequired);
      if (Array.isArray(snapshot.cart) && cart.length === 0) {
        snapshot.cart.forEach((item) => {
          const qty = Number(item.quantity || 1);
          for (let i = 0; i < qty; i += 1)
            addToCart(item.service, item.vehicleType);
        });
      }
      const finalize = async () => {
        if (snapshot.bookingId) {
          try {
            const res = await axios.get(
              `/api/virtual-shop/service-booking/${snapshot.bookingId}/confirm`,
            );
            const data = res?.data?.data;
            if (data?.invoiceId) setEstimateId(data.invoiceId);
            if (data?.totals) {
              const t = data.totals;
              setBookingTotals({
                ...(bookingTotals || ({} as BookingTotals)),
                grandTotal: Number(t.grandTotal || 0),
                giftCardRedeemed: Number(t.giftCardRedeemed || 0),
              });
            }
          } catch {}
        }
        setStep("confirmation");
        successToast("Deposit payment successful. Booking confirmed.");
        sessionStorage.removeItem("virtualShopPendingBooking");
        clearPaymentQueryParams();
        setIsResolvingBookingReturn(false);
      };
      finalize();
    } catch {
      setStep("confirmation");
      successToast("Payment successful!");
      clearPaymentQueryParams();
      setIsResolvingBookingReturn(false);
    }
  }, [
    searchParams,
    cart.length,
    addToCart,
    setSelectedDate,
    setSelectedSlot,
    setCustomerInfo,
    setBookingTotals,
    setStep,
    clearPaymentQueryParams,
  ]);

  const handlePhoneLookup = useCallback(async () => {
    if (!shop?.id) return;
    try {
      const response = await lookupClient({
        phone: normalizePhone(form.phone),
        shopId: shop.id,
      });
      if (response.success && response.data) {
        const client = response.data;
        const vehicles = Array.isArray(client.Vehicle) ? client.Vehicle : [];
        const latestVehicle = vehicles[0];
        setExistingVehicles(vehicles);
        setForm((prev) => ({
          ...prev,
          fullName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
          email: client.email || "",
          vehicleYear:
            latestVehicle?.year != null
              ? String(latestVehicle.year)
              : prev.vehicleYear,
          vehicleMake: latestVehicle?.make || prev.vehicleMake,
          vehicleModel: latestVehicle?.model || prev.vehicleModel,
        }));
        setIsReturningClient(true);
      } else {
        setExistingVehicles([]);
        setForm((prev) => ({ ...prev, fullName: "", email: "" }));
        setIsReturningClient(false);
      }
      setPhoneLookedUp(true);
    } catch {
      setPhoneLookedUp(true);
    }
  }, [form.phone, shop?.id, lookupClient, setIsReturningClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) {
      errorToast("Shop not found. Please refresh and try again.");
      return;
    }
    if (!selectedDate || !selectedSlot) {
      errorToast("Please select appointment date and time.");
      return;
    }
    if (cart.length === 0) {
      errorToast("Please select at least one service.");
      return;
    }
    const normalizedPhone = normalizePhone(form.phone);
    const normalizedMake = form.vehicleMake.trim();
    const normalizedModel = form.vehicleModel.trim();
    const normalizedFullName = form.fullName.trim() || "Guest";
    const normalizedEmail = form.email.trim();
    if (
      !normalizedPhone ||
      !normalizedMake ||
      !normalizedModel ||
      !form.vehicleYear
    ) {
      errorToast("Phone and vehicle details are required.");
      return;
    }
    if (normalizedPhone.length < 12 || normalizedPhone.length > 15) {
      errorToast("Phone must be between 10 and 15 digits.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      errorToast("Please enter a valid email address.");
      return;
    }
    const parsedYear = Number(form.vehicleYear);
    const maxVehicleYear = new Date().getFullYear() + 1;
    if (
      !Number.isFinite(parsedYear) ||
      parsedYear < 1886 ||
      parsedYear > maxVehicleYear
    ) {
      errorToast("Vehicle year must be a valid number.");
      return;
    }
    try {
      const response = await createBooking({
        shopId: shop.id,
        shopServices: cart.map((item) => ({
          shopServiceId: Number(item.service.id),
          vehicleType: item.vehicleType,
        })),
        appointmentDate: format(selectedDate, "yyyy-MM-dd"),
        appointmentStartTime: selectedSlot.time,
        fullName: normalizedFullName,
        email: normalizedEmail || undefined,
        phone: normalizedPhone,
        make: normalizedMake,
        model: normalizedModel,
        year: parsedYear,
        notes: form.notes.trim() || undefined,
        giftCardCode: appliedGiftCard?.code || undefined,
        sessionToken,
      });
      const client = response?.data?.client;
      const vehicle = response?.data?.vehicle;
      const apiTotals = response?.data?.totals;
      let normalizedTotals: BookingTotals | null = null;
      if (apiTotals) {
        normalizedTotals = {
          subtotal: Number(apiTotals.subtotal || 0),
          tax: Number(apiTotals.tax || 0),
          serviceFee: Number(apiTotals.serviceFee || 0),
          grandTotal: Number(apiTotals.grandTotal || 0),
          giftCardRedeemed: Number(apiTotals.giftCardRedeemed || 0),
          depositRequired: Number(apiTotals.depositRequired || 0),
          depositPaid: Number(apiTotals.depositPaid || 0),
          balanceDue: Number(apiTotals.balanceDue || 0),
        };
        setBookingTotals(normalizedTotals);
        setServerDepositRequired(normalizedTotals.depositRequired ?? 0);
      }
      setCustomerInfo({
        fullName:
          client?.firstName || client?.lastName
            ? `${client?.firstName || ""} ${client?.lastName || ""}`.trim()
            : form.fullName,
        email: client?.email || form.email,
        phone: client?.mobile || form.phone,
        vehicleYear: vehicle?.year ? String(vehicle.year) : form.vehicleYear,
        vehicleMake: vehicle?.make || form.vehicleMake,
        vehicleModel: vehicle?.model || form.vehicleModel,
        notes: form.notes,
      });
      setEstimateId(response?.data?.estimateId ?? null);
      setIsReturningClient(true);
      const newBookingId = response?.data?.shopBookingId;
      const responseStatus = response?.data?.status;
      if (responseStatus === "PENDING" && newBookingId && shop?.companyId) {
        const payableNow = Number(
          (apiTotals as any)?.payableNow || apiTotals?.depositRequired || 0,
        );
        sessionStorage.setItem(
          "virtualShopPendingBooking",
          JSON.stringify({
            bookingId: newBookingId.toString(),
            selectedDate: selectedDate?.toISOString(),
            selectedSlot,
            bookingTotals: normalizedTotals,
            customerInfo: {
              fullName:
                client?.firstName || client?.lastName
                  ? `${client?.firstName || ""} ${client?.lastName || ""}`.trim()
                  : form.fullName,
              email: client?.email || form.email,
              phone: client?.mobile || form.phone,
              vehicleYear: vehicle?.year
                ? String(vehicle.year)
                : form.vehicleYear,
              vehicleMake: vehicle?.make || form.vehicleMake,
              vehicleModel: vehicle?.model || form.vehicleModel,
              notes: form.notes,
            },
            cart,
          }),
        );
        setPayableDepositAmount(payableNow);
        setCreatedBookingId(newBookingId.toString());
        setShowPayNowModal(true);
        successToast(
          "Booking created. Please complete the deposit to confirm.",
        );
        return;
      }
      successToast(response?.message || "Booking confirmed successfully");
      setStep("confirmation");
    } catch (error) {
      errorToast(
        (error as { message?: string })?.message || "Failed to create booking",
      );
    }
  };

  const update = (field: keyof CustomerInfo, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (isResolvingBookingReturn) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <Loader2 className="w-7 h-7 mx-auto text-primary animate-spin" />
          <p className="text-base font-medium">Processing your payment...</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we finalize your booking confirmation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <CheckoutHeader
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          releaseHold();
          setStep("datetime");
        }}
      />

      <BookingSummaryCard
        cart={cart}
        shopFee={totals.shopFee}
        serviceFeeRate={totals.serviceFeeRate}
        tax={totals.tax}
        taxRate={totals.taxRate}
        isTaxEnabled={totals.isTaxEnabled}
        giftCardRedeemedPreview={totals.giftCardRedeemedPreview}
        adjustedGrandTotal={totals.adjustedGrandTotal}
        effectiveDepositDue={totals.effectiveDepositDue}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        cartDurationMinutes={cartDurationMinutes}
      />

      {createdBookingId && totals.effectiveDepositDue > 0 && (
        <PendingDepositBanner
          showPayNowModal={showPayNowModal}
          onOpenPayNow={() => setShowPayNowModal(true)}
        />
      )}

      {!totals.hasPendingBookingPayment && totals.isDepositEnabled && (
        <GiftCardSection
          giftCardCode={giftCardCode}
          isApplyingGiftCard={isApplyingGiftCard}
          appliedGiftCard={appliedGiftCard}
          giftCardError={giftCardError}
          onChange={(code) => {
            setGiftCardCode(code);
          }}
          onApply={handleApplyGiftCard}
          onRemove={clearAppliedGiftCard}
        />
      )}

      {!totals.hasPendingBookingPayment && (
        <CustomerForm
          form={form}
          phoneLookedUp={phoneLookedUp}
          isLookingUp={isLookingUp}
          isBookingSubmitting={isBookingSubmitting}
          selectedCountryCode={selectedCountryCode}
          existingVehicles={existingVehicles}
          termsAgreed={termsAgreed}
          shopTerms={shop?.termsConditions}
          shopPrivacy={shop?.privacyPolicy}
          onPhoneChange={(phone, isoCode) => {
            update("phone", phone);
            setSelectedCountryCode(isoCode);
            if (phoneLookedUp) {
              setForm((prev) => ({
                ...prev,
                fullName: "",
                email: "",
                vehicleYear: "",
                vehicleMake: "",
                vehicleModel: "",
              }));
              setExistingVehicles([]);
              setPhoneLookedUp(false);
              setIsReturningClient(false);
            }
          }}
          onContinue={handlePhoneLookup}
          onFieldChange={update}
          onTermsChange={setTermsAgreed}
          onSubmit={handleSubmit}
        />
      )}

      <TimerExpiredDialog
        open={timerExpired}
        onAddTime={handleAddTime}
        onReturn={() => {
          releaseHold();
          setStep("services");
        }}
      />

      {createdBookingId && shop?.companyId && (
        <PayNow
          due={(payableDepositAmount ?? totals.effectiveDepositDue).toString()}
          shopBookingId={createdBookingId}
          companyId={shop.companyId}
          mode="virtual_shop"
          open={showPayNowModal}
          setOpen={setShowPayNowModal}
          onSuccess={() => {
            setIsResolvingBookingReturn(true);
            sessionStorage.removeItem("virtualShopPendingBooking");
            setStep("confirmation");
          }}
          gatewayInfo={{
            paymentGateway: (gatewayInfo?.paymentGateway || "BOTH") as
              | "STRIPE"
              | "AUTHORIZE_NET"
              | "BOTH",
            hasStripe: gatewayInfo?.hasStripe ?? true,
            hasAuthorizeNet: gatewayInfo?.hasAuthorizeNet ?? true,
            tipEnabled: gatewayInfo?.tipEnabled ?? false,
          }}
        />
      )}
    </div>
  );
};
