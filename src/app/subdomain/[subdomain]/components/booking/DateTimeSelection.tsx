import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Phone,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useBooking } from "../../context/BookingContext";
import { TimeSlot } from "../../data/types";
import { useGetAppointmentSlots } from "@/hooks/virtual-shop/service/useShopService";
import { useGetShopBySlug } from "@/hooks/virtual-shop/service/useShopService";
import { useParams } from "next/navigation";
import { Calendar, ConfigProvider, theme } from "antd";
import dayjs from "dayjs";
import { Spinner } from "../ui/Spinner";
import toast from "react-hot-toast";

interface DateTimeSelectionProps {
  onAvailabilityChange?: (hasAvailableSlots: boolean) => void;
  onEmergencyRequest?: () => void;
}

export const DateTimeSelection = ({
  onAvailabilityChange,
  onEmergencyRequest,
}: DateTimeSelectionProps) => {
  const {
    setStep,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    sessionToken,
    cartDurationMinutes,
  } = useBooking();
  const params = useParams();
  const slug = String(params?.subdomain || "");
  const [showSlots, setShowSlots] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // Get shop from slug
  const { data: shop } = useGetShopBySlug(slug);

  const primaryColor = shop?.themeConfig?.primaryColor || "#1677ff";

  // Fetch all available slots for selected date
  const { data: slotsResponse, isPending: isSlotsLoading } =
    useGetAppointmentSlots(
      shop?.id,
      selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined,
      false,
      cartDurationMinutes || undefined,
    );

  // Fetch next available appointment info
  const { data: nextAvailableResponse } = useGetAppointmentSlots(
    shop?.id,
    undefined,
    true,
    cartDurationMinutes || undefined,
  );

  const handleDateSelect = (value: dayjs.Dayjs) => {
    const date = value.toDate();
    setSelectedDate(date);
    setSelectedSlot(null);
    setShowSlots(true);
  };

  // Disable dates in the past
  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf("day");
  };

  const findNextAvailable = () => {
    if (nextAvailableResponse?.date) {
      setSelectedDate(new Date(nextAvailableResponse.date));
      setShowSlots(true);
    }
  };

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!slotsResponse?.data || slotsResponse.data.length === 0) return [];

    return slotsResponse.data.map((slot) => {
      const [hours, minutes] = slot.time.split(":").map(Number);
      const period =
        hours < 12 ? "Morning" : hours < 17 ? "Afternoon" : "Evening";
      const label = `${hours > 12 ? hours - 12 : hours || 12}:${minutes.toString().padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;

      return {
        time: slot.time,
        label,
        period,
        available: slot.available,
      };
    });
  }, [slotsResponse?.data]);

  const grouped = useMemo(() => {
    const groups: Record<string, TimeSlot[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    timeSlots.forEach((s) => groups[s.period].push(s));
    return groups;
  }, [timeSlots]);

  useEffect(() => {
    if (!onAvailabilityChange) return;
    if (!showSlots || !selectedDate || isSlotsLoading) return;
    const hasAvailable =
      timeSlots.length > 0 && timeSlots.some((s) => s.available);
    onAvailabilityChange(hasAvailable);
  }, [timeSlots, showSlots, selectedDate, isSlotsLoading]);

  if (isSlotsLoading && showSlots && selectedDate) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  const handleContinue = async () => {
    if (!selectedSlot || !selectedDate || !shop?.id) return;

    setIsHolding(true);
    try {
      const response = await fetch("/api/virtual-shop/service-booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          sessionToken,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedSlot.time,
          duration: cartDurationMinutes || 30,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to hold slot");
      }

      setStep("checkout");
    } catch (error: any) {
      toast.error(error.message || "This slot is no longer available.");
      setSelectedSlot(null);
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setStep("services");
              setShowSlots(false);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Pick a Date & Time
            </h2>
            <p className="text-sm text-muted-foreground">
              Select when you'd like your appointment
            </p>
          </div>
        </div>
        {onEmergencyRequest && (
          <Button
            type="button"
            size="sm"
            onClick={onEmergencyRequest}
            className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm shrink-0"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Urgent Request</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ant Design Calendar */}
        <div className="flex flex-col items-center w-full">
          <div className="w-full max-w-[350px] p-2 rounded-xl border bg-card shadow-sm">
            <ConfigProvider
              theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                  colorPrimary: primaryColor,
                  borderRadius: 8,
                },
              }}
            >
              <Calendar
                fullscreen={false}
                value={selectedDate ? dayjs(selectedDate) : undefined}
                onSelect={handleDateSelect}
                disabledDate={disabledDate}
                headerRender={({ value, onChange }) => {
                  return (
                    <div className="flex justify-between items-center p-2 font-semibold">
                      {value.format("MMMM YYYY")}
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() =>
                            onChange(value.month(value.month() - 1))
                          }
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() =>
                            onChange(value.month(value.month() + 1))
                          }
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />
            </ConfigProvider>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5 text-xs"
            onClick={findNextAvailable}
          >
            <Zap className="w-3.5 h-3.5" /> Next Available Appointment
          </Button>
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          {showSlots && selectedDate ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-primary" />
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </div>

              {/* Contact Us banner when all slots are unavailable due to service duration */}
              {timeSlots.length > 0 && timeSlots.every((s) => !s.available) && (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
                  style={{
                    borderColor: `${primaryColor}50`,
                    backgroundColor: `${primaryColor}10`,
                  }}
                >
                  <p className="font-medium" style={{ color: primaryColor }}>
                    Service duration exceeds available hours. Contact us to
                    schedule.
                  </p>
                  {shop?.company?.phone && (
                    <a href={`tel:${shop.company.phone}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        style={{
                          borderColor: `${primaryColor}70`,
                          color: primaryColor,
                        }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {shop.company.phone}
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {Object.entries(grouped).map(([period, slots]) => {
                if (slots.length === 0) return null;
                return (
                  <div key={period} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {period}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                            slot.available &&
                              selectedSlot?.time !== slot.time &&
                              "bg-muted hover:bg-secondary text-foreground",
                            selectedSlot?.time === slot.time &&
                              "bg-primary text-primary-foreground shadow-md",
                            !slot.available &&
                              "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through",
                          )}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {timeSlots.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No available slots on this day.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={findNextAvailable}
                    className="gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Find Next Available
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Select a date to see available times
            </div>
          )}
        </div>
      </div>

      {selectedSlot && (
        <div className="flex justify-end">
          <Button
            size="lg"
            className="gap-2"
            onClick={handleContinue}
            disabled={isHolding}
          >
            {isHolding ? <Spinner size={20} /> : "Continue to Checkout"}{" "}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
