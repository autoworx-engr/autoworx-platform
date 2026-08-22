"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  BookingStep,
  CartItem,
  CustomerInfo,
  BookingTotals,
  Service,
  ShopSettings,
  TimeSlot,
  VehicleType,
} from "../data/types";
import { defaultSettings } from "../data/mock-services";

interface BookingContextType {
  // Cart
  cart: CartItem[];
  addToCart: (service: Service, vehicleType: VehicleType) => void;
  removeFromCart: (serviceId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartDurationMinutes: number;

  // Flow
  step: BookingStep;
  setStep: (step: BookingStep) => void;

  // Date/Time
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedSlot: TimeSlot | null;
  setSelectedSlot: (slot: TimeSlot | null) => void;

  // Customer
  customerInfo: CustomerInfo | null;
  setCustomerInfo: (info: CustomerInfo) => void;
  bookingTotals: BookingTotals | null;
  setBookingTotals: (totals: BookingTotals | null) => void;
  estimateId: string | null;
  setEstimateId: (id: string | null) => void;

  // Settings
  settings: ShopSettings;
  setSettings: (settings: ShopSettings) => void;

  // Services (admin)
  services: Service[];
  setServices: (services: Service[]) => void;

  // Pagination (server-side)
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  hasNextPage: boolean;
  setHasNextPage: (has: boolean) => void;
  hasPrevPage: boolean;
  setHasPrevPage: (has: boolean) => void;

  // Categories (from API)
  categories: string[];
  setCategories: (categories: string[]) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  // Mock OTP
  isReturningClient: boolean;
  setIsReturningClient: (v: boolean) => void;

  // Reset
  resetBooking: () => void;

  // Session
  sessionToken: string;
}

const BookingContext = createContext<BookingContextType | null>(null);

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be inside BookingProvider");
  return ctx;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<BookingStep>("services");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [bookingTotals, setBookingTotals] = useState<BookingTotals | null>(
    null,
  );
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [services, setServices] = useState<Service[]>([]);
  const [isReturningClient, setIsReturningClient] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const addToCart = useCallback(
    (service: Service, vehicleType: VehicleType) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.service.id === service.id);
        if (existing) return prev;
        return [...prev, { service, quantity: 1, vehicleType }];
      });
    },
    [],
  );

  const removeFromCart = useCallback((serviceId: string) => {
    setCart((prev) => prev.filter((i) => i.service.id !== serviceId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, i) => {
        const vehicleExtra =
          i.service.vehicleTypePricing[
            i.vehicleType.toLowerCase() as keyof typeof i.service.vehicleTypePricing
          ];
        return sum + (i.service.price + vehicleExtra) * i.quantity;
      }, 0),
    [cart],
  );
  const cartDurationMinutes = useMemo(
    () =>
      cart.reduce((sum, i) => sum + i.service.estimatedMinutes * i.quantity, 0),
    [cart],
  );

  const resetBooking = useCallback(() => {
    setCart([]);
    setStep("services");
    setSelectedDate(null);
    setSelectedSlot(null);
    setCustomerInfo(null);
    setBookingTotals(null);
    setIsReturningClient(false);
    setEstimateId(null);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        cartDurationMinutes,
        step,
        setStep,
        selectedDate,
        setSelectedDate,
        selectedSlot,
        setSelectedSlot,
        customerInfo,
        setCustomerInfo,
        bookingTotals,
        setBookingTotals,
        estimateId,
        setEstimateId,
        settings,
        setSettings,
        services,
        setServices,
        currentPage,
        setCurrentPage,
        totalPages,
        setTotalPages,
        hasNextPage,
        setHasNextPage,
        hasPrevPage,
        setHasPrevPage,
        categories,
        setCategories,
        selectedCategory,
        setSelectedCategory,
        isReturningClient,
        setIsReturningClient,
        resetBooking,
        sessionToken,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};
