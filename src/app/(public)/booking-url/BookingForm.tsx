"use client";

import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import moment from "moment";
import { getCurrentTime } from "@/utils/time";
import { decodeCompanyId } from "@/utils/companyIdEncoder";
import { processBooking } from "@/actions/booking/processBooking";

type FormData = {
  title: string;
  date: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  customerCompany: string;
};

const BookingForm = () => {
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");
  const companyId = refParam ? decodeCompanyId(refParam) : null;

  // Add state for company info if needed
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "",
    firstName: "",
    lastName: "",
    email: "",
    mobile: "+1",
    address: "",
    city: "",
    state: "",
    zip: "",
    customerCompany: "",
  });

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
    }
  }, [companyId]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (error[field]) {
      setError((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setSuccessMessage(""); // Clear previous success message

    const newError: Record<string, string> = {};

    if (!formData.title.trim()) {
      newError.title = "Appointment Title is required.";
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
      }
    }

    if (!formData.firstName.trim()) {
      newError.firstName = "First Name is required.";
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
          address: "",
          city: "",
          state: "",
          zip: "",
          customerCompany: "",
        });

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
    "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  return (
    <div className=" max-w-xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
        <h3 className="text-2xl font-bold ">Book Your Appointment</h3>
        <p className="text-blue-100 mt-1">Fill in the details below</p>
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
          <SlimInput
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            name="title"
            label="Appointment Title"
            required
            className={`${inputClass}`}
            error={error.title}
          />

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
                  min={isToday ? getCurrentTime() : undefined} //
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
                required={false}
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
                error={error.mobile}
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                name="mobile"
                label="Mobile"
                className={`${inputClass}`}
                required
              />
            </div>
            <SlimInput
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              rootClassName="flex-1"
              name="address"
              label="Address"
              className={`${inputClass}`}
              required={false}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <SlimInput
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                name="city"
                label="City"
                className={`${inputClass}`}
                required={false}
              />
              <SlimInput
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                name="state"
                label="State"
                className={`${inputClass}`}
                required={false}
              />
              <SlimInput
                value={formData.zip}
                onChange={(e) => handleChange("zip", e.target.value)}
                name="zip"
                label="Zip"
                className={`${inputClass}`}
                required={false}
              />
            </div>
            <SlimInput
              value={formData.customerCompany}
              onChange={(e) => handleChange("customerCompany", e.target.value)}
              name="customerCompany"
              required={false}
              className={`${inputClass}`}
              label="Company"
            />
          </div>

          <div className="p-0 pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-center rounded-md font-medium transition-colors ${
                isLoading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
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
