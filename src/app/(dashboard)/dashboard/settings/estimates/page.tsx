"use client";
import {
  getCompanyTermsAndPolicyTax,
  updateTaxCurrency,
  updateTermsPolicy,
} from "@/actions/settings/emailTemplates";
import { SlimInput } from "@/components/SlimInput";
import { Select } from "antd";
import { useEffect, useState } from "react";
import EmailTemplates from "./EmailTemplates";
import { successToast } from "@/lib/toast";

interface CurrencyData {
  Code: string;
}

type CurrencyInfo = {
  name: string;
  symbol: string;
};

type Country = {
  currencies?: {
    [currencyCode: string]: CurrencyInfo;
  };
};

type CurrencyOption = {
  value: string;
  label: string;
};

export default function EstimateAndInvoicePage() {
  const [currencies, setCurrencies] = useState<{ value: string }[]>([]);
  const [currency, setCurrency] = useState<string>("USD");
  const maxLength = 800;
  const [termPolicy, setTermPolicy] = useState<{
    terms?: string;
    policy?: string;
  }>({});

  const [tax, setTax] = useState<string>("0");
  const [serviceFee, setServiceFee] = useState<string>("0");
  const currentTermsLength = termPolicy?.terms?.length ?? 0;
  const currentPolicyLength = termPolicy?.policy?.length ?? 0;

  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setDisabled(
      currentTermsLength > maxLength || currentPolicyLength > maxLength
    );
  }, [currentTermsLength, currentPolicyLength]);

  useEffect(() => {
    async function getCurrencies() {
      const response = await fetch(
        "https://restcountries.com/v3.1/all?fields=currencies"
      );
      const data: { currencies?: { [currencyCode: string]: CurrencyInfo } }[] =
        await response.json();
      const currenciesMap: Record<string, CurrencyInfo> = {};

      data?.forEach((item) => {
        if (item.currencies) {
          Object.entries(item.currencies).forEach(([code, currency]) => {
            currenciesMap[code] = {
              name: currency.name,
              symbol: currency.symbol || "",
            };
          });
        }
      });

      const currencyOptions: CurrencyOption[] = Object.entries(
        currenciesMap
      ).map(([code, currency]) => ({
        value: code,
        label: `${currency.symbol ? currency.symbol + " " : ""}${code}`,
      }));

      setCurrencies(currencyOptions);
    }

    const fetchTermsPolicy = async () => {
      try {
        const data = await getCompanyTermsAndPolicyTax();
        setTermPolicy(data);
        setTax(String(data.tax));
        setServiceFee(String(data.serviceFee));
        setCurrency(data.currency);
      } catch (error) {
        console.log("Error fetching terms and policy in page:", error);
      }
    };
    getCurrencies();
    fetchTermsPolicy();
  }, []);

  const handleChange = (value: string) => {
    setCurrency(value);
  };

  const handleUpdateTermsPolicy = async () => {
    try {
      console.log(termPolicy);
      const res = await updateTermsPolicy({
        terms: termPolicy.terms?.trim() || "",
        policy: termPolicy.policy?.trim() || "",
      });
      res?.success && successToast("Terms & Policy added successfully");
    } catch (error) {
      console.log("Error updating terms and policy in page:", error);
    }
  };

  const handleUpdateCurrency = async () => {
    try {
      // Ensure tax and serviceFee are valid numbers or default to 0
      const validTax = tax && !isNaN(Number(tax)) ? tax : "0";
      const validServiceFee =
        serviceFee && !isNaN(Number(serviceFee)) ? serviceFee : "0";

      await updateTaxCurrency({
        currency,
        tax: validTax,
        serviceFee: validServiceFee,
      });
      successToast("Currency, Shop supplies & Tax updated successfully");
    } catch (error) {
      console.log("Error updating currency in page:", error);
    }
  };

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-4 px-5">
      <div className="space-y-4">
        {/* Currency & Tax */}
        <div>
          <h2 className="mb-2 text-xl font-semibold">Tax & Service Fee</h2>
          <div className="space-y-3 rounded-sm border bg-background p-5">
            <div className="flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
              <div className="relative w-full md:w-1/2">
                <SlimInput
                  name="taxAmount"
                  value={tax.toString()}
                  label="Tax Amount"
                  className="w-full"
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal points
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setTax(value);
                    }
                  }}
                />
                <span className="absolute bottom-1 right-1">%</span>
              </div>

              {/* Service Fee */}
              <div className="relative w-full md:w-1/2">
                <SlimInput
                  name="serviceFee"
                  value={serviceFee.toString()}
                  label="Shop Supplies"
                  className="w-full"
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string, numbers, and decimal points
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setServiceFee(value);
                    }
                  }}
                />
                <span className="absolute bottom-1 right-1">%</span>
              </div>
              <div className="flex w-full md:w-1/2 flex-col items-start">
                <div className="mb-1 px-2 text-sm font-medium sm:text-base">
                  Currency
                </div>
                <Select
                  showSearch
                  value={currency}
                  className="w-full"
                  filterOption={(input, option) =>
                    (option?.value ?? " ")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={handleChange}
                  options={currencies}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="rounded-md bg-[#6571FF] px-10 py-1.5 text-white"
                onClick={handleUpdateCurrency}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        {/* Terms & Conditions */}
        <div>
          <h2 className="mb-2 text-xl font-semibold">Terms & Conditions</h2>
          <div className="space-y-3 rounded-sm border bg-background p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-3">
              <label className="block">
                <div className="mb-1 px-2 font-medium">Terms & Conditions</div>
                <div className="relative">
                  <textarea
                    className={`h-60 w-full resize-none rounded-sm bg-background px-2 py-0.5 text-sm leading-6 outline-none ${
                      currentTermsLength > maxLength
                        ? "border border-red-500"
                        : "border border-primary-foreground border-slate-400"
                    }`}
                    name="terms"
                    value={
                      termPolicy && termPolicy.terms ? termPolicy.terms : ""
                    }
                    onChange={(e) =>
                      setTermPolicy({ ...termPolicy, terms: e.target.value })
                    }
                  />
                  <div className="absolute bottom-3 right-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {currentTermsLength} / {maxLength}
                  </div>
                </div>
              </label>
              <label className="block">
                <div className="mb-1 px-2 font-medium">Policy</div>
                <div className="relative">
                  <textarea
                    className={`h-60 w-full resize-none rounded-sm bg-background px-2 py-0.5 text-sm leading-6 outline-none ${
                      currentPolicyLength > maxLength
                        ? "border border-red-500"
                        : "border border-primary-foreground border-slate-400"
                    }`}
                    name="policy"
                    value={termPolicy?.policy}
                    onChange={(e) =>
                      setTermPolicy({ ...termPolicy, policy: e.target.value })
                    }
                  />
                  <div className="absolute bottom-3 right-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {currentPolicyLength} / {maxLength}
                  </div>
                </div>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                disabled={disabled}
                className={`rounded-md bg-[#6571FF] px-10 py-1.5 text-white ${
                  disabled ? "cursor-not-allowed opacity-50" : ""
                }`}
                onClick={handleUpdateTermsPolicy}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email templates section */}
      <div className="w-full space-y-4">
        <EmailTemplates />
      </div>
    </div>
  );
}
