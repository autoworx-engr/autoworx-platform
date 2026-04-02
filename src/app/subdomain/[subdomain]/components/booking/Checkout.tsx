import { useState, useEffect, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import {
  ArrowLeft,
  Clock,
  Shield,
  AlertTriangle,
  Timer,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format, addMinutes, parse } from "date-fns";
import { useBooking } from "../../context/BookingContext";
import { BookingTotals, CustomerInfo } from "../../data/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import { PayNow } from "@/components/invoice-modal/PayNow";
import { getPaymentGatewayInfo } from "@/app/(dashboard)/dashboard/settings/payments/getPaymentGatewayInfo";
import { useServerGet } from "@/hooks/useServerGet";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useCreateVirtualShopServiceBooking,
  useGetShopBySlug,
  useLookupClientByPhone,
} from "@/hooks/virtual-shop/service/useShopService";
import axios from "axios";
import PhoneInput from "@/components/PhoneInput";
import { SlimInput } from "@/components/SlimInput";
import { SlimTextarea } from "@/components/SlimTextarea";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import Selector from "@/app/(dashboard)/dashboard/settings/automation/components/Selector";
import { errorToast, successToast } from "@/lib/toast";

const TIMER_SECONDS = 600; // 10 min

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");
const isValidEmail = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
    setBookingTotals,
    setEstimateId,
    isReturningClient,
    setIsReturningClient,
    settings,
  } = useBooking();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  const { data: years }: any = useGetAllYears();
  const { data: makes }: any = useGetMake();

  const [selectedCountryCode, setSelectedCountryCode] = useState("US");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerExpired, setTimerExpired] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  const [isResolvingBookingReturn, setIsResolvingBookingReturn] =
    useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [isApplyingGiftCard, setIsApplyingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    code: string;
    maskedCode: string;
    balance: number;
  } | null>(null);
  const [serverDepositRequired, setServerDepositRequired] = useState<
    number | null
  >(null);
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

  const { data: models }: any = useGetModelsByYearAndMake(
    form.vehicleYear,
    form.vehicleMake,
  );

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setTimerExpired(true);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setTimerExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleAddTime = () => {
    setTimeLeft(TIMER_SECONDS);
    setTimerExpired(false);
  };

  const handlePhoneLookup = useCallback(async () => {
    if (!shop?.id) return;

    try {
      const response = await lookupClient({
        phone: normalizePhone(form.phone),
        shopId: shop.id,
      });

      if (response.success && response.data) {
        const client = response.data;
        setForm((prev) => ({
          ...prev,
          fullName: `${client.firstName} ${client.lastName}`.trim(),
          email: client.email || "",
        }));
        setIsReturningClient(true);
      } else {
        setIsReturningClient(false);
      }
      setPhoneLookedUp(true);
    } catch (error) {
      console.error("Phone lookup failed:", error);
      setPhoneLookedUp(true);
    }
  }, [form.phone, shop?.id, lookupClient, setIsReturningClient]);

  const handleOtpCheck = useCallback((val: string) => {
    setOtpValue(val);
    if (val === "1234") {
      setOtpVerified(true);
      // Auto-fill name & email but NOT vehicle info
      setForm((prev) => ({
        ...prev,
        fullName: "John Doe",
        email: "john@example.com",
      }));
    }
  }, []);

  const handleApplyGiftCard = useCallback(async () => {
    const normalizedCode = giftCardCode.trim().toUpperCase();
    if (!normalizedCode) {
      setGiftCardError("Please enter a gift card code");
      return;
    }

    setIsApplyingGiftCard(true);
    setGiftCardError("");

    try {
      const response = await axios.get(
        "/api/virtual-shop/issued-gift-card/check-balance",
        {
          params: {
            code: normalizedCode,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to validate gift card",
        );
      }

      const card = response.data?.data;
      const cardStatus = String(card?.status || "").toUpperCase();
      const balance = Number(card?.balance || 0);

      if (cardStatus !== "ACTIVE") {
        throw new Error(
          `Cannot redeem a ${cardStatus.toLowerCase()} gift card.`,
        );
      }

      if (!Number.isFinite(balance) || balance <= 0) {
        throw new Error("Gift card has no redeemable balance.");
      }

      setGiftCardCode(normalizedCode);
      setAppliedGiftCard({
        code: normalizedCode,
        maskedCode: card?.maskedCode || normalizedCode,
        balance,
      });
      setGiftCardError("");
      successToast("Gift card applied.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to validate gift card";
      setGiftCardError(message);
      errorToast(message);
    } finally {
      setIsApplyingGiftCard(false);
    }
  }, [giftCardCode]);

  const clearAppliedGiftCard = useCallback(() => {
    setAppliedGiftCard(null);
    setGiftCardError("");
  }, []);

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
        cart?: Array<{
          service: any;
          vehicleType: any;
          quantity?: number;
        }>;
      };

      if (snapshot.bookingId) {
        setCreatedBookingId(snapshot.bookingId);
      }

      if (snapshot.selectedDate) {
        setSelectedDate(new Date(snapshot.selectedDate));
      }

      if (snapshot.selectedSlot) {
        setSelectedSlot(snapshot.selectedSlot);
      }

      if (snapshot.customerInfo) {
        setCustomerInfo(snapshot.customerInfo);
      }

      if (snapshot.bookingTotals) {
        setBookingTotals(snapshot.bookingTotals);
      }

      if (typeof snapshot.depositRequired === "number") {
        setServerDepositRequired(snapshot.depositRequired);
      }

      if (Array.isArray(snapshot.cart) && cart.length === 0) {
        snapshot.cart.forEach((item) => {
          const qty = Number(item.quantity || 1);
          for (let i = 0; i < qty; i += 1) {
            addToCart(item.service, item.vehicleType);
          }
        });
      }

      setStep("confirmation");
      successToast("Deposit payment successful. Booking confirmed.");
      sessionStorage.removeItem("virtualShopPendingBooking");
      clearPaymentQueryParams();
      setIsResolvingBookingReturn(false);
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

    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      errorToast("Phone must be between 10 and 15 digits.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      errorToast("Please enter a valid email address.");
      return;
    }

    const parsedYear = Number(form.vehicleYear);
    const currentYear = new Date().getFullYear();
    if (
      !Number.isFinite(parsedYear) ||
      parsedYear < 1886 ||
      parsedYear > currentYear
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
        giftCardCode: appliedGiftCard?.code,
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
      successToast(response?.message || "Booking created successfully");

      const newBookingId = response?.data?.shopBookingId;
      const depositRequiredNow = Number(normalizedTotals?.depositRequired || 0);

      if (depositRequiredNow > 0 && newBookingId && shop?.companyId) {
        sessionStorage.setItem(
          "virtualShopPendingBooking",
          JSON.stringify({
            bookingId: newBookingId.toString(),
            depositRequired: depositRequiredNow,
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

        setCreatedBookingId(newBookingId.toString());
        setShowPayNowModal(true);
        successToast(
          "Booking created. Please complete the deposit to confirm.",
        );
        return;
      }

      setStep("confirmation");
    } catch (error) {
      const message =
        (error as { message?: string })?.message || "Failed to create booking";
      errorToast(message);
    }
  };

  const update = (field: keyof CustomerInfo, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const vehicleOptions =
    makes?.data?.map((vehicle: any) => ({
      title: vehicle.name ?? "Unknown",
      name: vehicle.name ?? "Unknown",
      id: vehicle.name,
    })) || [];

  const vehicleModelOptions =
    models?.data?.map((vehicle: any) => ({
      title: vehicle.name ?? "Unknown",
      name: vehicle.name ?? "Unknown",
      id: vehicle.name,
    })) || [];

  const yearOptions =
    years?.data?.map((y: string | number) => ({
      title: y.toString(),
      name: y.toString(),
      id: y.toString(),
    })) || [];

  const bookingSettings = shop?.bookingSettings;
  const isDepositEnabled =
    bookingSettings?.isDepositEnabled ?? settings.depositRequired;
  const depositType = bookingSettings?.depositType
    ? bookingSettings.depositType.toLowerCase()
    : settings.depositType;
  const depositValueRaw =
    bookingSettings?.depositValue !== undefined &&
    bookingSettings?.depositValue !== null
      ? Number(bookingSettings.depositValue)
      : settings.depositAmount;
  const depositValue = Number.isFinite(depositValueRaw) ? depositValueRaw : 0;

  const serviceBaseTotal = cart.reduce(
    (sum, item) => sum + Number(item.service.price || 0) * item.quantity,
    0,
  );
  const vehicleExtraTotal = cart.reduce((sum, item) => {
    const vehicleExtra = Number(
      item.service.vehicleTypePricing[
        item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing
      ] || 0,
    );
    return sum + vehicleExtra * item.quantity;
  }, 0);
  const subtotal = Number((serviceBaseTotal + vehicleExtraTotal).toFixed(2));

  const taxRateRaw = shop?.company?.tax ?? settings.taxPercent;
  const serviceFeeRateRaw =
    shop?.company?.serviceFee ?? settings.shopFeePercent;

  const taxRate = Number.isFinite(Number(taxRateRaw)) ? Number(taxRateRaw) : 0;
  const serviceFeeRate = Number.isFinite(Number(serviceFeeRateRaw))
    ? Number(serviceFeeRateRaw)
    : 0;

  const isServiceFeeEnabled =
    bookingSettings?.isServiceFeeEnabled ?? settings.shopFeeEnabled;
  const isTaxEnabled = bookingSettings?.isTaxEnabled ?? settings.taxEnabled;

  const shopFee = isServiceFeeEnabled
    ? Number(((serviceBaseTotal * serviceFeeRate) / 100).toFixed(2))
    : 0;
  const tax = isTaxEnabled
    ? Number(((serviceBaseTotal * taxRate) / 100).toFixed(2))
    : 0;
  const grandTotal = Number((subtotal + shopFee + tax).toFixed(2));
  const giftCardRedeemedPreview = appliedGiftCard
    ? Number(Math.min(appliedGiftCard.balance, grandTotal).toFixed(2))
    : 0;
  const adjustedGrandTotal = Number(
    Math.max(0, grandTotal - giftCardRedeemedPreview).toFixed(2),
  );

  const calculatedDepositAmount = isDepositEnabled
    ? depositType === "fixed"
      ? depositValue
      : Number(((adjustedGrandTotal * depositValue) / 100).toFixed(2))
    : 0;
  const depositAmount = Number(
    Math.min(adjustedGrandTotal, Math.max(0, calculatedDepositAmount)).toFixed(
      2,
    ),
  );
  const effectiveDepositDue = serverDepositRequired ?? depositAmount;
  const hasPendingBookingPayment =
    Boolean(createdBookingId) && effectiveDepositDue > 0;

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
      {/* Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("datetime")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${timeLeft < 120 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
        >
          <Timer className="w-3.5 h-3.5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Booking Summary */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Booking Summary
        </p>
        {cart.map((item) => {
          const vehicleExtra =
            item.service.vehicleTypePricing[
              item.vehicleType.toLowerCase() as keyof typeof item.service.vehicleTypePricing
            ];
          const itemPrice = (item.service.price + vehicleExtra) * item.quantity;
          return (
            <div key={item.service.id} className="flex justify-between text-sm">
              <span>
                {item.service.title}{" "}
                <span className="text-xs text-muted-foreground">
                  ({item.vehicleType})
                </span>
              </span>
              <span className="font-medium">${itemPrice}</span>
            </div>
          );
        })}
        <div className="border-t pt-2 space-y-1">
          {shopFee > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shop Fee ({serviceFeeRate}%)</span>
              <span>${shopFee}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({taxRate}%)</span>
              <span>${tax}</span>
            </div>
          )}
          {giftCardRedeemedPreview > 0 && (
            <div className="flex justify-between text-xs text-emerald-600">
              <span>Gift Card Applied</span>
              <span>-${giftCardRedeemedPreview.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>${adjustedGrandTotal.toFixed(2)}</span>
          </div>
          {effectiveDepositDue > 0 && (
            <div className="flex justify-between text-xs text-primary">
              <span>Deposit Due Now</span>
              <span>${effectiveDepositDue.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}
          </span>
          {selectedSlot && (
            <span className="flex items-center gap-1">
              {selectedSlot.label} –{" "}
              {(() => {
                const start = parse(selectedSlot.time, "HH:mm", new Date());
                return format(addMinutes(start, cartDurationMinutes), "h:mm a");
              })()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {cartDurationMinutes >= 60
              ? `${Math.floor(cartDurationMinutes / 60)}h ${cartDurationMinutes % 60 > 0 ? `${cartDurationMinutes % 60}m` : ""}`
              : `${cartDurationMinutes}m`}
          </span>
        </div>
      </div>

      {createdBookingId && effectiveDepositDue > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold">Deposit payment required</p>
          <p className="text-xs text-muted-foreground">
            Your booking is saved as pending. Complete the deposit to confirm
            your appointment.
          </p>
          <Button
            type="button"
            className="w-full"
            onClick={() => setShowPayNowModal(true)}
          >
            {showPayNowModal
              ? "Complete Payment in Open Modal"
              : "Open Pay Now"}
          </Button>
        </div>
      )}

      {!hasPendingBookingPayment && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Gift Card Redemption (Optional)
          </p>

          <div className="flex gap-2">
            <Input
              value={giftCardCode}
              onChange={(e) => {
                setGiftCardCode(e.target.value.toUpperCase());
                setGiftCardError("");
              }}
              placeholder="Enter gift card code"
              className="uppercase"
              disabled={isApplyingGiftCard}
            />

            {appliedGiftCard?.code ? (
              <Button
                type="button"
                variant="outline"
                onClick={clearAppliedGiftCard}
              >
                Remove
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleApplyGiftCard}
                disabled={!giftCardCode.trim() || isApplyingGiftCard}
              >
                {isApplyingGiftCard ? "Applying..." : "Apply"}
              </Button>
            )}
          </div>

          {appliedGiftCard && (
            <p className="text-xs text-emerald-600">
              {appliedGiftCard.maskedCode} applied. Available balance: $
              {appliedGiftCard.balance.toFixed(2)}
            </p>
          )}

          {giftCardError && (
            <p className="text-xs text-destructive">{giftCardError}</p>
          )}
        </div>
      )}

      {/* Customer Form */}
      {!hasPendingBookingPayment && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone first — used to check returning client */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">
              Phone Number <span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                type="hidden"
                id="phone"
                value={form.phone}
                onChange={() => {}}
              />
              <div className="flex-1">
                <PhoneInput
                  label=""
                  placeholder="1234567890"
                  required
                  defaultIsoCode={selectedCountryCode}
                  onChange={(num, code, isoCode) => {
                    const newPhone = `${code}${num}`;
                    update("phone", newPhone);
                    setSelectedCountryCode(isoCode || "US");

                    if (phoneLookedUp) {
                      setPhoneLookedUp(false);
                      setIsReturningClient(false);
                    }
                  }}
                />
              </div>
              {!phoneLookedUp && form.phone.length >= 7 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handlePhoneLookup}
                  disabled={isLookingUp}
                >
                  {isLookingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </Button>
              )}
              {/* {phoneLookedUp && !isReturningClient && (
              <span className="flex items-center  text-xs text-muted-foreground">
                New client
              </span>
            )} */}
            </div>
          </div>

          {/* OTP for returning clients — shown right after phone lookup */}
          {/* {isReturningClient && showOtp && !otpVerified && (
          <div className="rounded-xl border bg-card p-4 space-y-3 text-center">
            <Shield className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium">
              Welcome back! Verify your identity
            </p>
            <p className="text-xs text-muted-foreground">
              Enter the 4-digit code sent to your phone. (Use:{" "}
              <strong>1234</strong>)
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={otpValue}
                onChange={handleOtpCheck}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpVerified && (
              <p className="text-xs text-primary flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified! Fields
                auto-populated.
              </p>
            )}
          </div>
        )} */}

          {/* Remaining fields — shown after phone lookup (or OTP verified for returning) */}
          {phoneLookedUp && (true || !isReturningClient || otpVerified) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <SlimInput
                  id="name"
                  name="fullName"
                  label="Full Name"
                  required
                  labelClassName="text-xs font-medium"
                  className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <SlimInput
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  required
                  labelClassName="text-xs font-medium"
                  className="h-10 text-sm font-normal rounded-md border-input bg-background px-3 py-2"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="john@email.com"
                />
              </div>
            </div>
          )}

          {phoneLookedUp && (true || !isReturningClient || otpVerified) && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                Vehicle Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Selector
                  name="vehicleYear"
                  label="Year"
                  placeholder="Year"
                  options={years?.data || []}
                  value={form.vehicleYear || ""}
                  onChange={(value: string) => update("vehicleYear", value)}
                  isSearch={true}
                  isClear={true}
                  required={true}
                />
                <Selector
                  name="vehicleMake"
                  label="Make"
                  placeholder="Make"
                  options={vehicleOptions || []}
                  value={form.vehicleMake || ""}
                  onChange={(value: string) => {
                    update("vehicleMake", value);
                    update("vehicleModel", "");
                  }}
                  isSearch={true}
                  isClear={true}
                  required={true}
                />
                <Selector
                  name="vehicleModel"
                  label="Model"
                  placeholder="Model"
                  options={vehicleModelOptions || []}
                  value={form.vehicleModel || ""}
                  onChange={(value: string) => update("vehicleModel", value)}
                  isSearch={true}
                  isClear={true}
                  required={true}
                  disabled={!form.vehicleMake}
                />
              </div>

              <div className="space-y-1.5">
                <SlimTextarea
                  id="notes"
                  name="notes"
                  label="Notes"
                  labelClassName="text-xs font-medium"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Any special requests..."
                  rows={3}
                  className="text-sm font-normal rounded-md"
                />
              </div>

              {/* Policies */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Your info is
                  secure and encrypted.
                </p>
                <p>
                  By confirming, an <strong>Autoworx client account</strong>{" "}
                  will be created automatically. Future bookings will use OTP
                  verification for faster checkout.
                </p>
                <p>
                  Free cancellation up to 24 hours before your appointment.{" "}
                  <a href="#" className="text-primary underline">
                    Cancellation Policy
                  </a>
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isBookingSubmitting}
              >
                {isBookingSubmitting ? "Confirming..." : "Confirm Booking"}
              </Button>
            </>
          )}
        </form>
      )}

      {/* Timer Expired Dialog */}
      <Dialog open={timerExpired} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" /> Time's Up!
            </DialogTitle>
            <DialogDescription>
              Your reservation has expired. Would you like to extend or start
              over?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleAddTime} className="gap-2">
              <Timer className="w-4 h-4" /> Add 10 More Minutes
            </Button>
            <Button variant="outline" onClick={() => setStep("services")}>
              Return to Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {createdBookingId && shop?.companyId && (
        <PayNow
          due={effectiveDepositDue.toString()}
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
            paymentGateway: gatewayInfo?.paymentGateway || "BOTH",
            hasStripe: gatewayInfo?.hasStripe ?? true,
            hasAuthorizeNet: gatewayInfo?.hasAuthorizeNet ?? true,
          }}
        />
      )}
    </div>
  );
};
