"use client";

import { cn } from "@/lib/cn";
import countriesData from "@/utils/allcountries.json";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type CountryOption = {
  id: string;
  title: string;
  flagUrl?: string | null;
  code?: string | null;
  isoCode?: string | null;
};

async function fetchCountries(): Promise<CountryOption[]> {
  const raw: any[] = Array.isArray(countriesData) ? countriesData : [];

  const map = new Map<string, CountryOption>();

  for (const c of raw) {
    const title = (c.name || "").toString();
    const flagUrl = c.flagUrl || null;

    const code = c.callingCode || null;
    const isoCode = c.countryCode || null;

    if (!title) continue;

    const normalizedTitle = title.trim();
    const key = `${normalizedTitle.toLowerCase()}|${(code || "").toString()}`;

    if (!map.has(key)) {
      map.set(key, {
        id: normalizedTitle,
        title: normalizedTitle,
        flagUrl: flagUrl || null,
        code: code || undefined,
        isoCode: isoCode ? isoCode.toUpperCase() : undefined,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

type PhoneInputProps = {
  value?: string;
  onChange?: (
    phoneNumber: string,
    callingCode: string,
    countryCode: string,
  ) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  defaultValue?: string;
  defaultIsoCode?: string;
};

export default function PhoneInput({
  value = "",
  onChange,
  label = "Phone Number",
  placeholder = "1234567890",
  required = false,
  disabled = false,
  error,
  defaultValue,
  defaultIsoCode,
}: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitializedRef = useRef(false);

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Reset initialization when defaultValue or defaultIsoCode changes
  useEffect(() => {
    isInitializedRef.current = false;
  }, [defaultValue, defaultIsoCode]);

  // Initialize component with default values
  useEffect(() => {
    if (isInitializedRef.current || isLoading || !countries.length) return;

    let countryToSet: CountryOption | null = null;
    let phoneToSet = "";

    // Find country by ISO code (priority)
    if (defaultIsoCode) {
      const iso = defaultIsoCode.toUpperCase();
      countryToSet = countries.find((c) => c.isoCode === iso) || null;
    }

    //  If no ISO code, try to parse from defaultValue
    if (!countryToSet && defaultValue && defaultValue.startsWith("+")) {
      const cleaned = defaultValue.replace(/\s+/g, "");
      const match = cleaned.match(/^(\+\d{1,4})(\d*)$/);

      if (match) {
        const code = match[1];
        phoneToSet = match[2];
        countryToSet = countries.find((c) => c.code === code) || null;
      }
    }

    //  Set phone number — strip dial code digits from the full number
    if (countryToSet && defaultValue) {
      const digitsOnly = defaultValue.replace(/\D/g, ""); // e.g. "11236547856"
      const dialDigits = (countryToSet.code || "").replace(/\D/g, ""); // e.g. "1"
      // Slice off the dial code prefix once
      phoneToSet = digitsOnly.startsWith(dialDigits)
        ? digitsOnly.slice(dialDigits.length)
        : digitsOnly;
    } else if (defaultValue && !phoneToSet) {
      // No country matched — use raw digits
      phoneToSet = defaultValue.replace(/\D/g, "");
    }

    // Default to US if no country found
    if (!countryToSet) {
      countryToSet =
        countries.find((c) => c.isoCode === "US") ||
        countries.find((c) => c.code === "+1") ||
        countries[0] ||
        null;
    }

    setSelectedCountry(countryToSet);
    setPhoneNumber(phoneToSet);
    isInitializedRef.current = true;

    // Notify parent
    if (countryToSet && onChange) {
      onChange(phoneToSet, countryToSet.code || "", countryToSet.isoCode!);
    }
  }, [countries, isLoading, defaultValue, defaultIsoCode, onChange]);

  // Sync with external value prop (for controlled component)
  useEffect(() => {
    if (value !== undefined && value !== phoneNumber) {
      setPhoneNumber(value);
    }
  }, [value]);

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

  // useEffect(() => {
  //   if (isOpen && searchInputRef.current) {
  //     searchInputRef.current.focus();
  //   }
  // }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    const lower = searchTerm.toLowerCase();
    return countries.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) || c.code?.includes(searchTerm),
    );
  }, [countries, searchTerm]);

  const handleCountrySelect = (country: CountryOption) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");
    onChange?.(phoneNumber, country.code || "", country.isoCode || "");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/\D/g, "");
    setPhoneNumber(num);
    onChange?.(
      num,
      selectedCountry?.code || "",
      selectedCountry?.isoCode || "",
    );
  };

  const handleClear = () => {
    setPhoneNumber("");
    onChange?.("", selectedCountry?.code || "", selectedCountry?.isoCode || "");
  };

  return (
    <div className="w-full">
      {label && (
        <label
          className={cn(
            "flex items-center gap-1 text-base font-medium text-slate-700 dark:text-slate-200 transition-colors duration-300",
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative mt-1.5" ref={dropdownRef}>
        <div
          className={`flex items-center rounded-lg border transition-all ${
            error
              ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/40"
              : "border-slate-300 dark:border-slate-700 focus-within:border-[#6571FF]/60 dark:focus-within:border-[#6571FF]/60 focus-within:ring-2 focus-within:ring-[#6571FF]/40"
          } ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
              : "bg-white dark:bg-slate-900"
          }`}
        >
          {/* Country Code Button */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-50 hover:rounded-lg dark:hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {selectedCountry?.flagUrl ? (
              <img
                src={selectedCountry.flagUrl || "/placeholder.svg"}
                alt={selectedCountry.title}
                width={18}
                height={12}
                className="rounded-sm object-cover"
              />
            ) : (
              <div className="w-4 h-3 bg-slate-300 dark:bg-slate-600 rounded-sm" />
            )}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-fit">
              {selectedCountry?.code || "+"}
            </span>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {/* Phone Number Input */}
          <div className="relative flex-1">
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-4 pr-10 py-[2px] bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
            />

            {phoneNumber && (
              <button
                type="button"
                aria-label="Clear phone number"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Country List */}
            <div className="max-h-64 overflow-y-auto thin-scrollbar">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      selectedCountry?.id === country.id
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {country.flagUrl && (
                      <img
                        src={country.flagUrl || "/placeholder.svg"}
                        alt={country.title}
                        width={20}
                        height={14}
                        className="rounded-sm object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {country.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {country.code}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
