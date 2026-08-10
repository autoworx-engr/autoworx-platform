"use client";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TIMER_SECONDS } from "./checkoutUtils";

interface UseCheckoutTimerProps {
  shopId?: number;
  sessionToken?: string;
  selectedDate: Date | null;
  selectedSlot: { time: string; label: string } | null;
  cartDurationMinutes: number;
}

export const useCheckoutTimer = ({
  shopId,
  sessionToken,
  selectedDate,
  selectedSlot,
  cartDurationMinutes,
}: UseCheckoutTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerExpired, setTimerExpired] = useState(false);

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
  }, [timeLeft]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleAddTime = useCallback(async () => {
    if (shopId && sessionToken && selectedDate && selectedSlot) {
      await fetch("/api/virtual-shop/service-booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          sessionToken,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedSlot.time,
          duration: cartDurationMinutes || 30,
        }),
      }).catch(() => {});
    }
    setTimeLeft(TIMER_SECONDS);
    setTimerExpired(false);
  }, [shopId, sessionToken, selectedDate, selectedSlot, cartDurationMinutes]);

  return { timeLeft, timerExpired, formatTime, handleAddTime };
};
