"use client";

import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import moment from "moment";
import { getCurrentTime } from "@/utils/time";
import { decodeCompanyId } from "@/utils/companyIdEncoder";
import { processBooking } from "@/actions/booking/processBooking";
import { getCompanyCalendarSettings } from "@/actions/booking/getCompanyCalendarSettings";
import Image from "next/image";
import { getCompanyById } from "@/actions/settings/getCompnayById";

type FormData = {
  title: string;
  date: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  notes: string;
};

const BookingForm = () => {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");
  const companyId = refParam ? decodeCompanyId(refParam) : null;

  // Add state for company info if needed
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [calendarSettings, setCalendarSettings] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "+1",
    notes: "",
  });

  // State for handling title dropdown and custom input
  const [selectedTitleOption, setSelectedTitleOption] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Predefined title options
  const titleOptions = [
    "Phone Call Request",
    "Free Consultation", 
    "Wrap Design Consultation",
    "Virtual Appointment",
    "Custom"
  ];

  const [error, setError] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [date, setDate] = useState<string | undefined>(
    moment().toISOString().split("T")[0]
  );
  const [minDate, setMinDate] = useState<string>("");
  const isToday = date
    ? moment(date).toDate().toDateString() ===
      moment(date).toDate().toDateString()
    : false;

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
      console.log("Decoded company ID:", companyId);

      // Fetch calendar settings for the company
      getCompanyCalendarSettings(companyId.toString()).then((settings) => {
        setCalendarSettings(settings);
      });
    }
  }, [companyId]);

  // Clear startTime if it's outside the valid range when date or calendar settings change
  useEffect(() => {
    if (formData.startTime && formData.date) {
      const restrictions = getTimeRestrictions();
      const currentTime = formData.startTime;
      const selectedDate = moment(formData.date);
      const appointmentDateTime = moment(
        `${formData.date} ${formData.startTime}`
      );
      const now = moment();

      // Clear if the appointment is in the past
      if (appointmentDateTime.isBefore(now)) {
        handleChange("startTime", "");
        return;
      }

      // Only clear based on restrictions if they exist
      if (restrictions.min || restrictions.max) {
        if (
          (restrictions.min && currentTime < restrictions.min) ||
          (restrictions.max && currentTime > restrictions.max)
        ) {
          handleChange("startTime", "");
        }
      }
    }
  }, [formData.date, calendarSettings]);

  const handleChange = (field: keyof FormData, value: any) => {
    let processedValue = value;

    if (field === "mobile") {
      processedValue = processedValue.replace(/\D/g, "");

      if (!processedValue.startsWith("+1")) {
        if (processedValue.startsWith("+")) {
          processedValue = "+1" + processedValue.slice(1);
        } else if (processedValue.startsWith("1")) {
          processedValue = "+" + processedValue;
        } else {
          processedValue = "+1" + processedValue;
        }
      }
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));

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
        `${formData.date} ${formData.startTime}`
      );
      const now = moment();

      if (appointmentDateTime.isBefore(now)) {
        newError.startTime = "Appointment time must be in the future.";
      } else if (calendarSettings) {
        // Only check calendar restrictions if settings exist and appointment is not in the past
        const dayStart = calendarSettings.dayStart || "08:00";
        const dayEnd = calendarSettings.dayEnd || "18:00";
        const selectedDate = moment(formData.date);
        const isSelectedDateToday = selectedDate.isSame(moment(), "day");

        // For today, check if time is after current time AND within business hours
        if (isSelectedDateToday) {
          const currentTime = getCurrentTime();
          const effectiveMinTime =
            currentTime > dayStart ? currentTime : dayStart;
          if (
            formData.startTime < effectiveMinTime ||
            formData.startTime > dayEnd
          ) {
            newError.startTime = `Please select a time between ${moment(effectiveMinTime, "HH:mm").format("h:mm A")} and ${moment(dayEnd, "HH:mm").format("h:mm A")}.`;
          }
        } else {
          // For future dates, only check business hours
          if (formData.startTime < dayStart || formData.startTime > dayEnd) {
            newError.startTime = `Please select a time between ${moment(dayStart, "HH:mm").format("h:mm A")} and ${moment(dayEnd, "HH:mm").format("h:mm A")}.`;
          }
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
    } else if (!/^\+1[\d\s\-$$$$]+$/.test(formData.mobile)) {
      newError.mobile =
        "Phone number must start with '+1' and contain valid characters.";
    }

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

    try {
      // Process the booking
      const result = await processBooking(formData, companyId);

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
        });

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
      setError({
        general:
          "An error occurred while booking your appointment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "focus:border-[#00B4B5] focus:outline-none focus:ring-2 focus:ring-[#00B4B5]";
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
            "w-14 h-14 rounded-full border-2 border-white"
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
              <span className="mb-1 text-sm font-medium">Appointment Title</span>
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
                error.title && "border-red-500 focus-visible:ring-red-500"
              )}
              required
            >
              <option value="">Select appointment type...</option>
              {titleOptions.map((option) => (
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
                <input
                  value={formData.startTime}
                  min={getTimeRestrictions().min}
                  max={getTimeRestrictions().max}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  id="start-time"
                  type="time"
                  name="startTime"
                  className={cn(
                    slimInputClassName,
                    "h-[33px] px-3 w-full",
                    inputClass,
                    error.startTime &&
                      "border-red-500 focus-visible:ring-red-500"
                  )}
                />

                {calendarSettings && formData.date && (
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const selectedDate = moment(formData.date);
                      const isSelectedDateToday = selectedDate.isSame(
                        moment(),
                        "day"
                      );
                      const dayStart = calendarSettings.dayStart || "08:00";
                      const dayEnd = calendarSettings.dayEnd || "18:00";

                      if (isSelectedDateToday) {
                        const currentTime = getCurrentTime();
                        const effectiveStartTime =
                          currentTime > dayStart ? currentTime : dayStart;
                        return `Available hours: ${moment(effectiveStartTime, "HH:mm").format("h:mm A")} - ${moment(dayEnd, "HH:mm").format("h:mm A")}`;
                      } else {
                        return `Available hours: ${moment(dayStart, "HH:mm").format("h:mm A")} - ${moment(dayEnd, "HH:mm").format("h:mm A")}`;
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
              <SlimInput
                type="tel"
                error={error.mobile}
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                name="mobile"
                label="Mobile"
                className={`${inputClass}`}
                required
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
                  inputClass
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
