"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";
import { slimInputClassName } from "./SlimInput";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  rootClassName?: string;
  className?: string;
  selectionClassName?: string;
  placeHolder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  type?: string;
  label?: string;
  minTime?: string;
  isEndTime?: boolean;
  startTime?: string;
  selectedDate?: Date;
}

export function TimeInput({
  value,
  onChange,
  rootClassName,
  className,
  selectionClassName,
  placeHolder,
  label,
  minTime,
  isEndTime = false,
  startTime = "",
  selectedDate,
  ...props
}: TimeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert 24h to 12h format for display
  const formatTo12Hour = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Convert 12h to 24h format for value
  const formatTo24Hour = (hour: number, minute: number, period: string) => {
    let hours = hour;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  // Function to check if a specific time is disabled
  const isTimeDisabled = (hour: number, minute: number, period: string) => {
    if (!minTime) return false;

    // For debugging
    // console.log(`Checking: ${hour}:${minute} ${period} against min ${minTime}`);

    // Check the specific time against the minTime
    const timeValue = formatTo24Hour(hour, minute, period);
    // console.log(`Comparing ${timeValue} vs ${minTime}: ${timeValue < minTime}`);

    return timeValue < minTime;
  };

  // Updated function to determine which periods are valid for an hour
  const getValidPeriods = (hour: number) => {
    if (!minTime) return { AM: true, PM: true };

    // Parse min time
    const [minHours] = minTime.split(":").map(Number);
    const minPeriod = minHours >= 12 ? "PM" : "AM";
    const minDisplayHour = minHours % 12 || 12;

    // Get current time info
    const now = new Date();
    const currentHour = now.getHours();
    const currentPeriod = currentHour >= 12 ? "PM" : "AM";
    const currentDisplayHour = currentHour % 12 || 12;

    // For hours after the min display hour, both periods may be valid
    if (hour > minDisplayHour) {
      // If min period is AM but hour is less than current hour in PM,
      // then AM is invalid for that hour if current period is PM
      if (
        minPeriod === "AM" &&
        currentPeriod === "PM" &&
        hour < currentDisplayHour
      ) {
        return { AM: false, PM: true };
      }
      return { AM: true, PM: true };
    }

    // For hours that are the same as min display hour
    if (hour === minDisplayHour) {
      if (minPeriod === "AM") {
        // If current period is PM, AM is invalid for the current hour
        if (currentPeriod === "PM" && hour === currentDisplayHour) {
          return { AM: false, PM: true };
        }
        return { AM: true, PM: true };
      }
      // If min period is PM, AM is valid but PM requires minute check
      return { AM: true, PM: true };
    }

    // For hours less than min display hour
    // If min period is AM, this hour is only valid in PM
    if (minPeriod === "AM") {
      return { AM: false, PM: true };
    }
    // If min period is PM, this hour is valid in AM
    return { AM: true, PM: false };
  };

  // Improved function to check if an hour should be completely disabled
  const shouldDisableHour = (hour: number) => {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentPeriod = currentHour >= 12 ? "PM" : "AM";
    const currentDisplayHour = currentHour % 12 || 12;

    // Special case: current hour should NEVER be completely disabled
    if (hour === currentDisplayHour) {
      return false;
    }

    // If no minimum time is set, no need to disable
    if (!minTime) return false;

    // Get the valid periods for this hour
    const validPeriods = getValidPeriods(hour);

    // If neither AM nor PM is valid, disable the hour
    if (!validPeriods.AM && !validPeriods.PM) {
      return true;
    }

    // Check if the hour is before the current hour on the current day
    const isBeforeCurrentHour =
      (currentPeriod === "PM" && hour < currentDisplayHour) ||
      (currentPeriod === "AM" && hour < currentDisplayHour);

    if (isBeforeCurrentHour) {
      return true;
    }

    // Parse minTime
    const [minHours, minMinutes] = minTime.split(":").map(Number);
    const minPeriod = minHours >= 12 ? "PM" : "AM";
    const minDisplayHour = minHours % 12 || 12;

    // If this hour is less than the min display hour, it should be disabled
    if (hour < minDisplayHour) {
      return true;
    }

    // Check if this hour would be valid in either period
    let validInAnyPeriod = false;

    // Check AM period
    if (validPeriods.AM) {
      const timeValueAM = formatTo24Hour(hour, 0, "AM");
      if (timeValueAM >= minTime) {
        validInAnyPeriod = true;
      }
    }

    // Check PM period
    if (validPeriods.PM) {
      const timeValuePM = formatTo24Hour(hour, 0, "PM");
      if (timeValuePM >= minTime) {
        validInAnyPeriod = true;
      }
    }

    // If not valid in any period, disable it
    return !validInAnyPeriod;
  };
  // Get the preferred period for a newly selected hour
  const getPreferredPeriod = (hour: number) => {
    // Get current time info
    const now = new Date();
    const currentHour = now.getHours();
    const currentPeriod = currentHour >= 12 ? "PM" : "AM";
    const currentDisplayHour = currentHour % 12 || 12;

    // If no minTime constraint, just use these simple rules:
    if (!minTime) {
      // If current period is PM, default new selections to PM
      if (currentPeriod === "PM") {
        return "PM";
      }

      // If we're in AM and selected hour is less than current hour, use PM
      if (currentPeriod === "AM" && hour <= currentDisplayHour) {
        return "PM";
      }

      // Otherwise use AM
      return "AM";
    }

    // If there is a minTime constraint
    const [minHours] = minTime.split(":").map(Number);
    const minPeriod = minHours >= 12 ? "PM" : "AM";
    const minDisplayHour = minHours % 12 || 12;

    // Rule 1: If current time is PM, prefer PM for new selections
    if (currentPeriod === "PM") {
      // But check if AM is required by minTime
      if (minPeriod === "PM" && hour < minDisplayHour) {
        return "AM"; // AM is the only valid choice
      }
      return "PM";
    }

    // Rule 2: If hour is less than min display hour and min period is AM, must use PM
    if (minPeriod === "AM" && hour < minDisplayHour) {
      return "PM";
    }

    // Rule 3: For the same hour as current hour
    if (hour === currentDisplayHour) {
      // Current period is most natural
      return currentPeriod;
    }

    // Rule 4: For hours less than current display hour (when in AM), use PM
    if (hour < currentDisplayHour && currentPeriod === "AM") {
      return "PM";
    }

    // Default to current period
    return currentPeriod;
  };

  // Function to check if hour should be disabled
  const isHourDisabled = (hour: number, period: string) => {
    if (!minTime) return false;

    const [minHours, minMinutes] = minTime.split(":").map(Number);
    const minPeriod = minHours >= 12 ? "PM" : "AM";
    const minDisplayHours = minHours % 12 || 12;

    // If checking AM period
    if (period === "AM") {
      // Disable if min period is AM and hour is less than min hours
      if (minPeriod === "AM" && hour < minDisplayHours) {
        return true;
      }
      // If min period is PM, AM hours are all valid
      return false;
    }

    // If checking PM period
    if (period === "PM") {
      // If min period is AM, PM hours are all valid
      if (minPeriod === "AM") {
        return false;
      }
      // If min period is PM, disable hours less than min hours
      return hour < minDisplayHours;
    }

    return false;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Add function to check if a value is selected
  const isSelected = (
    type: "hour" | "minute" | "period",
    val: number | string,
  ) => {
    if (!value) return false;
    const [hours = "12", minutes = "00", period = "AM"] = (
      formatTo12Hour(value) || "12:00 AM"
    ).split(/[:\s]/);

    if (type === "hour") return parseInt(hours) === val;
    if (type === "minute") return parseInt(minutes) === val;
    if (type === "period") return period === val;
    return false;
  };

  return (
    <label className={cn("block", rootClassName)}>
      {label && (
        <div className="mb-1 px-2 font-medium">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </div>
      )}
      <div className={cn("relative 2xl:w-28", rootClassName)} ref={dropdownRef}>
        <input
          {...props}
          ref={inputRef}
          type="text"
          className={cn(slimInputClassName, className)}
          value={formatTo12Hour(value)}
          placeholder={placeHolder ? placeHolder : "--:-- --"}
          onClick={() => setIsOpen(true)}
          readOnly
        />
        {isOpen && (
          <div
            className={cn(
              "absolute z-50 mt-1 w-48 rounded-md border border-gray-200 bg-background shadow-lg",
              selectionClassName,
            )}
          >
            <div className="grid grid-cols-3 gap-1 p-2">
              <div className="h-[200px] overflow-y-auto">
                {hours.map((hour) => {
                  // Check if the hour should be completely disabled
                  const isDisabled = shouldDisableHour(hour);

                  return (
                    <button
                      key={hour}
                      type="button"
                      className={cn(
                        "w-full rounded px-2 py-1 text-left hover:bg-gray-100",
                        isSelected("hour", hour) &&
                          "bg-primary text-white hover:bg-primary",
                        isDisabled &&
                          "cursor-not-allowed text-gray-300 hover:bg-background",
                      )}
                      onClick={() => {
                        // Get current time info
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();
                        const currentPeriod = currentHour >= 12 ? "PM" : "AM";
                        const currentDisplayHour = currentHour % 12 || 12;

                        // Special handling for current hour in current period
                        if (
                          hour === currentDisplayHour &&
                          ((!minTime && currentPeriod === "PM") ||
                            (minTime && minTime.includes(currentPeriod)))
                        ) {
                          // Use current minute + 1 to ensure we're in the future
                          const futureMinute = Math.min(currentMinute + 1, 59);
                          onChange(
                            formatTo24Hour(hour, futureMinute, currentPeriod),
                          );
                          console.log("hi 1");
                          return;
                        }

                        // Special handling for end time when selecting the same hour as start time
                        if (isEndTime && startTime) {
                          const [startHour, startMinute] = startTime
                            .split(":")
                            .map(Number);
                          const startDisplayHour = startHour % 12 || 12;
                          const startPeriod = startHour >= 12 ? "PM" : "AM";

                          // If selecting the same hour as start time
                          if (
                            hour === startDisplayHour &&
                            startPeriod === getPreferredPeriod(hour)
                          ) {
                            // Set minute to start minute + 5 (or next available minute)
                            const futureMinute = Math.min(startMinute + 5, 59);
                            onChange(
                              formatTo24Hour(hour, futureMinute, startPeriod),
                            );
                            console.log("hi 2");

                            return;
                          }
                        }

                        // Always use 00 as default minute when selecting an hour
                        const defaultMinute = 0;

                        // Get the appropriate period based on current time and constraints
                        const preferredPeriod = getPreferredPeriod(hour);

                        // Check if preferred period is valid
                        const validPeriods = getValidPeriods(hour);
                        const isPreferredPeriodValid =
                          preferredPeriod === "AM"
                            ? validPeriods.AM
                            : validPeriods.PM;

                        // If preferred period is valid, use it
                        if (isPreferredPeriodValid) {
                          // Check if this specific time would be valid
                          const timeToCheck = formatTo24Hour(
                            hour,
                            defaultMinute,
                            preferredPeriod,
                          );
                          if (!minTime || timeToCheck >= minTime) {
                            // Set the complete time immediately
                            onChange(timeToCheck);
                            console.log("hi 3");

                            return;
                          }
                        }

                        // If preferred period doesn't work, try the alternate period
                        const alternatePeriod =
                          preferredPeriod === "AM" ? "PM" : "AM";
                        const isAlternatePeriodValid =
                          alternatePeriod === "AM"
                            ? validPeriods.AM
                            : validPeriods.PM;

                        if (isAlternatePeriodValid) {
                          const alternateTimeToCheck = formatTo24Hour(
                            hour,
                            defaultMinute,
                            alternatePeriod,
                          );
                          if (!minTime || alternateTimeToCheck >= minTime) {
                            onChange(alternateTimeToCheck);
                            console.log("hi 4");

                            return;
                          }
                        }

                        // If we get here, neither period works at 00 minutes
                        // Try to find a valid minute value for either period
                        if (isPreferredPeriodValid) {
                          for (let m = 1; m < 60; m++) {
                            const timeToCheck = formatTo24Hour(
                              hour,
                              m,
                              preferredPeriod,
                            );
                            if (!minTime || timeToCheck >= minTime) {
                              onChange(timeToCheck);
                              console.log("hi 5");

                              return;
                            }
                          }
                        }

                        if (isAlternatePeriodValid) {
                          for (let m = 0; m < 60; m++) {
                            const timeToCheck = formatTo24Hour(
                              hour,
                              m,
                              alternatePeriod,
                            );
                            if (!minTime || timeToCheck >= minTime) {
                              onChange(timeToCheck);
                              console.log("hi 6");

                              return;
                            }
                          }
                        }
                      }}
                      disabled={isDisabled}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
              <div className="h-[200px] overflow-y-auto">
                {minutes.map((minute) => {
                  const [hours = "12", _, period = "AM"] = (
                    formatTo12Hour(value) || "12:00 AM"
                  ).split(/[:\s]/);
                  const hourValue = parseInt(hours);

                  // Get current time
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentPeriod = currentHour >= 12 ? "PM" : "AM";
                  const currentDisplayHour = currentHour % 12 || 12;
                  const isToday =
                    selectedDate?.toDateString() === now.toDateString(); // Check if it's today
                  if (
                    isToday && // Only check past minutes if the selected date is today
                    hourValue === currentDisplayHour &&
                    period === currentPeriod
                  ) {
                    if (minute < currentMinute) {
                      return (
                        <button
                          key={minute}
                          type="button"
                          className={cn(
                            "w-full rounded px-2 py-1 text-left hover:bg-gray-100",
                            isSelected("minute", minute) &&
                              "bg-primary text-white hover:bg-primary",
                            "cursor-not-allowed text-gray-300 hover:bg-background",
                          )}
                        >
                          {minute.toString().padStart(2, "0")}
                        </button>
                      );
                    }
                  }

                  // Get valid periods for this specific time
                  const validPeriods = getValidPeriods(hourValue);
                  const currentPeriodValid =
                    period === "AM" ? validPeriods.AM : validPeriods.PM;

                  // Start with basic period validation
                  let isDisabled = !currentPeriodValid;

                  // Check if this specific time combination is valid
                  if (!isDisabled && minTime) {
                    const timeToCheck = formatTo24Hour(
                      hourValue,
                      minute,
                      period,
                    );
                    isDisabled = timeToCheck < minTime;
                  }

                  return (
                    <button
                      key={minute}
                      type="button"
                      className={cn(
                        "w-full rounded px-2 py-1 text-left hover:bg-gray-100",
                        isSelected("minute", minute) &&
                          "bg-primary text-white hover:bg-primary",
                        isDisabled &&
                          "cursor-not-allowed text-gray-300 hover:bg-background",
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          onChange(formatTo24Hour(hourValue, minute, period));
                        }
                      }}
                      // disabled={isDisabled}
                    >
                      {minute.toString().padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
              <div className="flex h-[200px] flex-col justify-start">
                {["AM", "PM"].map((period) => {
                  const [hours = "12", minutes = "00"] = (
                    formatTo12Hour(value) || "12:00 AM"
                  ).split(/[:\s]/);
                  const hourValue = parseInt(hours);
                  const minuteValue = parseInt(minutes);

                  // Get valid periods for this hour
                  const validPeriods = getValidPeriods(hourValue);
                  const isPeriodValid =
                    period === "AM" ? validPeriods.AM : validPeriods.PM;

                  // Start with basic period validation
                  let isDisabled = !isPeriodValid;

                  // Check if this specific time combination is valid
                  if (!isDisabled && minTime) {
                    const timeToCheck = formatTo24Hour(
                      hourValue,
                      minuteValue,
                      period,
                    );
                    isDisabled = timeToCheck < minTime;
                  }

                  return (
                    <button
                      key={period}
                      type="button"
                      className={cn(
                        "w-full rounded px-2 py-1 text-left hover:bg-gray-100",
                        isSelected("period", period) &&
                          "bg-primary text-white hover:bg-primary",
                        isDisabled &&
                          "cursor-not-allowed text-gray-300 hover:bg-background",
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          onChange(
                            formatTo24Hour(hourValue, minuteValue, period),
                          );
                        }
                      }}
                      disabled={isDisabled}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
