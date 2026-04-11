"use client";

import { getCompanyCalendarSettings } from "@/actions/booking/getCompanyCalendarSettings";
import {
  getAppointmentByDateTime,
  processBooking,
} from "@/actions/booking/processBooking";
import { getCompanyById } from "@/actions/settings/getCompnayById";
import PhoneInput from "@/components/PhoneInput";
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import useBookingFormQueryById from "@/hooks/bookingForm/useBookingFormQueryById";
import { cn } from "@/lib/utils";
import { decodeCompanyId } from "@/utils/companyIdEncoder";
import { getCurrentTime } from "@/utils/time";
import { CalendarSettings } from "@prisma/client";
import { Select } from "antd";
import moment from "moment";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type FormData = {
  title: string;
  date: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  notes: string;
  countryCode: string;
};

const BookingForm = () => {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");
  const [companyId, bookingFormId] = refParam ? decodeCompanyId(refParam) : [];
  const [callingCode, setCallingCode] = useState("+1");
  const [isoCode, setIsoCode] = useState("");
  const { data: bookingForm, isLoading: bookingFromLoading } =
    useBookingFormQueryById(Number(bookingFormId));

  const [timeOptions, setTimeOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Add state for company info if needed
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [calendarSettings, setCalendarSettings] =
    useState<CalendarSettings | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "+1",
    notes: "",
    countryCode: "US",
  });

  // State for handling title dropdown and custom input
  const [selectedTitleOption, setSelectedTitleOption] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Predefined title options
  const titleOptionsForCrmEnable = ["Book a Demo", "Customer Support"];

  // Predefined title options
  const titleOptions = [
    "Phone Call Request",
    "Free Consultation",
    // "Wrap Design Consultation",
    "Virtual Appointment",
    "Custom",
  ];

  const availableTitleOptions = companyInfo?.isCRMEnabled
    ? titleOptionsForCrmEnable
    : titleOptions;

  const [error, setError] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [date, setDate] = useState<string | undefined>(
    moment().toISOString().split("T")[0],
  );
  const [minDate, setMinDate] = useState<string>("");
  const isToday = date
    ? moment(date).toDate().toDateString() ===
      moment(date).toDate().toDateString()
    : false;

  useEffect(() => {
    const updateTimeOptions = async () => {
      if (formData.date) {
        console.log("Updating time options for date:", formData.date);
        const getAppointmentByDate = await getAppointmentByDateTime(
          Number(companyId),
          formData.date,
        );
        console.log(
          "Existing appointments on this date:",
          getAppointmentByDate,
        );

        const options = getTimeOptions();
        // Filter out already booked times
        const filteredOptions = options.filter((option) => {
          const isBooked =
            getAppointmentByDate?.filter(
              (appt) => appt.startTime === option.value,
            ).length ?? 0;
          return isBooked < (bookingForm?.stack || 6);
        });
        setTimeOptions(filteredOptions);
      } else {
        setTimeOptions(getTimeOptions());
      }
    };
    updateTimeOptions();
  }, [calendarSettings, formData.date]);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const company = await getCompanyById({ companyId: `${companyId}` });
        setCompanyInfo(company || null);
      } catch (error) {
        console.error("Error fetching company info:", error);
      }
    };

    fetchCompany();
  }, [companyId]);

  // Set minimum date to today
  useEffect(() => {
    const today = moment().toDate();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  // Optional: Fetch company information based on companyId
  useEffect(() => {
    if (companyId) {
      // TODO: Implement company info fetching if needed
      // fetchCompanyInfo(companyId).then(setCompanyInfo);

      // Fetch calendar settings for the company
      getCompanyCalendarSettings(companyId.toString()).then((settings) => {
        setCalendarSettings(settings);
      });
    }
  }, [companyId]);

  // Clear startTime if it's outside the valid range when date or calendar settings change
  useEffect(() => {
    if (formData.startTime && formData.date) {
      const appointmentDateTime = moment(
        `${formData.date} ${formData.startTime}`,
      );
      const now = moment();

      // Clear if the appointment is in the past
      if (appointmentDateTime.isBefore(now)) {
        handleChange("startTime", "");
        return;
      }

      // Check if the selected time is still available in the current options
      const availableOptions = timeOptions;
      const isTimeAvailable = availableOptions.some(
        (option) => option.value === formData.startTime,
      );

      if (!isTimeAvailable) {
        handleChange("startTime", "");
      }
    }
  }, [formData.date, calendarSettings]);

  const handleChange = (field: keyof FormData, value: any) => {
    let processedValue = value;

    // if (field === "mobile") {
    //   processedValue = processedValue.replace(/\D/g, "");

    //   if (!processedValue.startsWith("+1")) {
    //     if (processedValue.startsWith("+")) {
    //       processedValue = "+1" + processedValue.slice(1);
    //     } else if (processedValue.startsWith("1")) {
    //       processedValue = "+" + processedValue;
    //     } else {
    //       processedValue = "+1" + processedValue;
    //     }
    //   }
    // }

    // setFormData((prev) => ({ ...prev, [field]: processedValue }));
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle title dropdown selection
  const handleTitleSelection = (value: string) => {
    setSelectedTitleOption(value);

    if (value === "Custom") {
      setFormData((prev) => ({ ...prev, title: customTitle }));
    } else {
      setFormData((prev) => ({ ...prev, title: value }));
      setCustomTitle(""); // Clear custom title when selecting predefined option
    }

    // Clear title error if exists
    if (error.title) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }
  };

  // Handle custom title input
  const handleCustomTitleChange = (value: string) => {
    setCustomTitle(value);
    setFormData((prev) => ({ ...prev, title: value }));

    // Clear title error if exists
    if (error.title) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors.title;
        return newErrors;
      });
    }
  };

  // Helper function to get time restrictions based on calendar settings
  const getTimeRestrictions = () => {
    const restrictions: { min?: string; max?: string } = {};

    if (calendarSettings) {
      const dayStart = calendarSettings.dayStart || "08:00";
      const dayEnd = calendarSettings.dayEnd || "18:00";
      const selectedDate = moment(formData.date);
      const isSelectedDateToday = selectedDate.isSame(moment(), "day");

      if (isSelectedDateToday) {
        // If it's today, use the later of current time or dayStart
        const currentTime = getCurrentTime();
        restrictions.min = currentTime > dayStart ? currentTime : dayStart;
      } else {
        // If it's a future date, use dayStart
        restrictions.min = dayStart;
      }

      restrictions.max = dayEnd;
    } else if (formData.date && moment(formData.date).isSame(moment(), "day")) {
      // Fallback: if no calendar settings and it's today, use current time
      restrictions.min = getCurrentTime();
    }
    // If no calendar settings and it's not today, no restrictions

    return restrictions;
  };

  // Generate time options with 15-minute intervals within office hours
  const getTimeOptions = () => {
    const options: { value: string; label: string }[] = [];
    const restrictions = getTimeRestrictions();

    // Default office hours if no settings
    const dayStart = calendarSettings?.dayStart || "08:00";
    const dayEnd = calendarSettings?.dayEnd || "18:00";

    // Parse start and end times
    const [startHour, startMinute] = dayStart.split(":").map(Number);
    const [endHour, endMinute] = dayEnd.split(":").map(Number);

    // Convert to minutes for easier calculation
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // If we have restrictions (for today), use them
    let effectiveStartTime = startTimeInMinutes;
    let effectiveEndTime = endTimeInMinutes;

    if (restrictions.min) {
      const [minHour, minMinute] = restrictions.min.split(":").map(Number);
      const minTimeInMinutes = minHour * 60 + minMinute;
      effectiveStartTime = Math.max(effectiveStartTime, minTimeInMinutes);

      // Round up to next 15-minute interval if needed
      const remainder = effectiveStartTime % 15;
      if (remainder !== 0) {
        effectiveStartTime += 15 - remainder;
      }
    }

    if (restrictions.max) {
      const [maxHour, maxMinute] = restrictions.max.split(":").map(Number);
      const maxTimeInMinutes = maxHour * 60 + maxMinute;
      effectiveEndTime = Math.min(effectiveEndTime, maxTimeInMinutes);
    }

    // Generate 15-minute intervals
    for (
      let minutes = effectiveStartTime;
      minutes <= effectiveEndTime;
      minutes += 15
    ) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;

      // Skip if we've gone past the end time
      if (hour * 60 + minute > effectiveEndTime) break;

      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const label = moment(`${hour}:${minute}`, "HH:mm").format("h:mm A");

      options.push({ value, label });
    }

    return options;
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setSuccessMessage(""); // Clear previous success message

    const newError: Record<string, string> = {};

    if (!formData.title.trim()) {
      if (selectedTitleOption === "Custom") {
        newError.title = "Please enter a custom appointment title.";
      } else {
        newError.title = "Appointment Title is required.";
      }
    }

    if (!formData.date) {
      newError.date = "Date is required.";
    }

    if (!formData.startTime) {
      newError.startTime = "Start Time is required.";
    } else {
      // Check if the appointment is in the future
      const appointmentDateTime = moment(
        `${formData.date} ${formData.startTime}`,
      );
      const now = moment();

      if (appointmentDateTime.isBefore(now)) {
        newError.startTime = "Appointment time must be in the future.";
      } else {
        // Additional validation - check if selected time is still available
        const availableOptions = timeOptions;
        const isTimeAvailable = availableOptions.some(
          (option) => option.value === formData.startTime,
        );

        if (!isTimeAvailable) {
          newError.startTime =
            "Selected time is no longer available. Please choose a different time.";
        }
      }
    }

    if (!formData.firstName.trim()) {
      newError.firstName = "First Name is required.";
    }
    if (!formData.lastName.trim()) {
      newError.lastName = "Last Name is required.";
    }

    if (!formData.mobile.trim()) {
      newError.mobile = "Mobile is required.";
    } else if (formData.mobile.length < 10) {
      newError.mobile = "Please enter a valid phone number.";
    }
    //  else if (!/^\+1[\d\s\-$$$$]+$/.test(formData.mobile)) {
    //   newError.mobile =
    //     "Phone number must start with '+1' and contain valid characters.";
    // }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newError.email = "Invalid email address.";
    }

    if (Object.keys(newError).length > 0) {
      setError(newError);
      setIsLoading(false);
      return;
    }

    if (!companyId) {
      setError({
        general: "Invalid booking link. Please contact the company directly.",
      });
      setIsLoading(false);
      return;
    }

    const dayName = moment(formData.date).format("dddd").toLowerCase();
    if (
      calendarSettings?.weekend1.toLowerCase() === dayName ||
      calendarSettings?.weekend2.toLowerCase() === dayName
    ) {
      setError({
        general:
          "The selected date falls on a weekend. Please choose a weekday.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const fullPhoneNumber = `${callingCode}${formData.mobile}`;
      const bookingData = {
        ...formData,
        mobile: fullPhoneNumber,
      };
      // Process the booking
      const result = await processBooking(
        bookingData,
        companyId,
        bookingForm?.id!,
      );

      if (result.success) {
        // Reset form on success
        setFormData({
          title: "",
          date: "",
          startTime: "",
          firstName: "",
          lastName: "",
          email: "",
          mobile: "+1",
          notes: "",
          countryCode: "US",
        });
        setCallingCode("+1");
        // Reset title selection states
        setSelectedTitleOption("");
        setCustomTitle("");

        // Show success message
        setSuccessMessage(result.message);
        setError({}); // Clear any previous errors
      } else {
        setError({ general: result.message });
      }
    } catch (error) {
      console.error("Submission error:", error);
      if (error instanceof Error) {
        setError({ general: error.message });
      } else {
        setError({
          general:
            "An error occurred while booking your appointment. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "focus:border-[#00B4B5] focus:outline-none focus:ring-2 focus:ring-[#00B4B5]";

  if (!bookingFromLoading && !isLoading && !bookingForm?.isActive) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
        <Image
          src={companyInfo?.image || "/icons/business.png"}
          alt="Company Logo"
          width={80}
          height={80}
          className={cn(
            !companyInfo?.image && "bg-white",
            "w-20 h-20 rounded-full mx-auto mb-4",
          )}
        />

        <h3 className="text-2xl font-bold mb-2">
          {companyInfo?.name || "Appointments Unavailable"}
        </h3>

        <p className="text-gray-600 mb-4">
          No appointment slots are available at this time. Please try again
          later or contact the company directly to schedule an appointment.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {companyInfo?.email && (
            <a
              href={`mailto:${companyInfo.email}`}
              className="px-4 py-2 bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white rounded-md"
            >
              Email Us
            </a>
          )}

          {companyInfo?.phone && (
            <a
              href={`tel:${companyInfo.phone}`}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              Call Us
            </a>
          )}

          {!companyInfo?.email && !companyInfo?.phone && (
            <span className="px-4 py-2 text-sm text-gray-500">
              Please check back later for available slots.
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-xl scale-90 mx-auto bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="flex items-center gap-4 bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white p-6 rounded-t-2xl">
        <Image
          src={companyInfo?.image || "/icons/business.png"}
          alt="Company Logo"
          width={56}
          height={56}
          className={cn(
            !companyInfo?.image && "bg-white",
            "w-14 h-14 rounded-full border-2 border-white",
          )}
        />
        <div>
          <h3 className="text-2xl font-bold">
            {companyInfo?.name || "Book Your Appointment"}
          </h3>
          <p className="text-blue-100 mt-1">Fill in the details below</p>
        </div>
      </div>

      <div className="p-6">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        {error.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error.general}</p>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="grid gap-6">
          {/* Title Selection */}
          <div className="space-y-2">
            <label className="flex gap-1 items-center" htmlFor="title-select">
              <span className="mb-1 text-sm font-medium">
                Appointment Title
              </span>
              <span className="text-red-500">*</span>
            </label>

            <select
              id="title-select"
              value={selectedTitleOption}
              onChange={(e) => handleTitleSelection(e.target.value)}
              className={cn(
                slimInputClassName,
                "h-[33px] px-3 w-full",
                inputClass,
                error.title && "border-red-500 focus-visible:ring-red-500",
              )}
              required
            >
              <option value="">Select appointment type...</option>
              {availableTitleOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "Custom" ? "Custom (Enter your own)" : option}
                </option>
              ))}
            </select>

            {/* Custom title input - only show when "Custom" is selected */}
            {selectedTitleOption === "Custom" && (
              <SlimInput
                value={customTitle}
                onChange={(e) => handleCustomTitleChange(e.target.value)}
                name="customTitle"
                label="Enter Custom Title"
                placeholder="Enter your custom appointment title"
                required
                className={`${inputClass}`}
              />
            )}

            {error.title && (
              <p className="text-sm text-red-600 mt-1">{error.title}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SlimInput
              error={error.date}
              min={minDate}
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              name="date"
              label="Date"
              type="date"
              className={`${inputClass}`}
              required
            />
            <div className="space-y-2 mt-1">
              <div className="">
                <label
                  className="flex gap-1  items-center"
                  htmlFor="start-time"
                >
                  <span className="mb-1 text-sm font-medium ">Start Time </span>{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.startTime}
                  onChange={(value) => handleChange("startTime", value)}
                  placeholder="Select time..."
                  disabled={!formData.date || timeOptions.length === 0}
                  className={cn(
                    "h-[33px] w-full font-semibold text-gray-600",
                    inputClass,
                    error.startTime &&
                      "border-red-500 focus-visible:ring-red-500",
                  )}
                  dropdownStyle={{
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                  options={[
                    { value: "", label: "Select time..." },
                    // ...getTimeOptions(),
                    ...timeOptions,
                  ]}
                />

                {calendarSettings && formData.date && (
                  <p
                    className={cn(
                      "text-xs text-gray-500 mt-1",
                      timeOptions.length === 0 && "text-red-500",
                    )}
                  >
                    {(() => {
                      const selectedDate = moment(formData.date);
                      const isSelectedDateToday = selectedDate.isSame(
                        moment(),
                        "day",
                      );
                      const dayStart = calendarSettings.dayStart || "08:00";
                      const dayEnd = calendarSettings.dayEnd || "18:00";

                      if (isSelectedDateToday && timeOptions.length > 0) {
                        const currentTime = getCurrentTime();
                        const effectiveStartTime =
                          currentTime > dayStart ? currentTime : dayStart;
                        return `Available hours: ${moment(effectiveStartTime, "HH:mm").format("h:mm A")} - ${moment(dayEnd, "HH:mm").format("h:mm A")}`;
                      } else if (
                        !isSelectedDateToday &&
                        timeOptions.length > 0
                      ) {
                        return `Available hours: ${moment(dayStart, "HH:mm").format("h:mm A")} - ${moment(dayEnd, "HH:mm").format("h:mm A")}`;
                      } else if (timeOptions.length === 0) {
                        return "No available time slots for the selected date.";
                      }
                    })()}
                  </p>
                )}

                {error.startTime && (
                  <p id="start-time-error" className="text-sm text-red-500">
                    {error.startTime}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Client Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <SlimInput
                error={error.firstName}
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                name="firstName"
                label="First Name"
                className={`${inputClass}`}
                required
              />
              <SlimInput
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                name="lastName"
                label="Last Name"
                className={`${inputClass}`}
                required
                error={error.lastName}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SlimInput
                error={error.email}
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                name="email"
                label="Email"
                className={`${inputClass}`}
                type="email"
              />
              {/* <SlimInput
                type="tel"
                error={error.mobile}
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                name="mobile"
                label="Mobile"
                className={`${inputClass}`}
                required
              /> */}

              <PhoneInput
                // value={formData.mobile}
                onChange={(phone, code, isoCode) => {
                  setFormData((prev) => ({
                    ...prev,
                    mobile: phone,
                    countryCode: isoCode,
                  }));
                  setCallingCode(code);

                  if (error.mobile) {
                    setError((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.mobile;
                      return newErrors;
                    });
                  }
                }}
                label="Mobile"
                placeholder="1234567890"
                required
                error={error.mobile}
                // defaultIsoCode="US"
              />
            </div>

            <div className="space-y-2">
              <label className="flex gap-1 items-center" htmlFor="notes">
                <span className="mb-1 text-sm font-medium">Notes</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add any additional notes for your appointment..."
                rows={3}
                className={cn(
                  "w-full px-3 py-2 border border-gray-300 rounded-md resize-none",
                  "focus:border-[#00B4B5] focus:outline-none focus:ring-2 focus:ring-[#00B4B5]",
                  inputClass,
                )}
              />
            </div>
          </div>

          <div className="p-0 pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-center rounded-md font-medium transition-colors ${
                isLoading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#00b8b0] to-[#0098da] hover:bg-[#00b8b0] text-white"
              }`}
            >
              {isLoading ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
