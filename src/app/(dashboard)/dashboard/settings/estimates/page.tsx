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
import { DollarSign, FileText, Percent } from "lucide-react";

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
    <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-8 p-1">
      {/* LEFT COLUMN: Tax, Service Fee & Terms */}
      <div className="space-y-6">
        {/* Tax, Service Fee & Currency Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex items-center mb-4">
            <DollarSign className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-bold ">
              Tax, Service Fee & Currency
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Tax Amount */}
              <div className="relative w-full">
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
                <span className="absolute bottom-1 right-3 text-gray-500">
                  <Percent className="w-4 h-4" />
                </span>
              </div>

              {/* Service Fee (Shop Supplies) */}
              <div className="relative w-full">
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
                <span className="absolute bottom-1 right-3 text-gray-500">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              
              {/* Currency Select */}
              <div className="flex w-full flex-col items-start">
                <div className="mb-1 px-2 text-sm font-medium text-gray-700">
                  Currency
                </div>
                <Select
                  showSearch
                  value={currency}
                  className="w-full [&_.ant-select-selector]:!h-10 [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-gray-300 [&_.ant-select-selector]:!shadow-sm"
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

            <div className="flex justify-end pt-2">
              <button
                className="rounded-lg bg-[#6571FF] px-8 py-2 text-base font-medium text-white shadow-md hover:bg-[#5661FF] transition duration-150"
                onClick={handleUpdateCurrency}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Terms & Conditions Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="flex items-center mb-4">
            <FileText className="w-6 h-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-bold ">
              Terms & Policy
            </h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              {/* Terms & Conditions Textarea */}
              <label className="block">
                <div className="mb-1 px-1 font-medium ">
                  Terms & Conditions
                </div>
                <div className="relative">
                  <textarea
                    className={`h-60 w-full resize-none rounded-lg bg-gray-50 px-3 py-2 text-sm leading-6 outline-none transition duration-150 ${
                      currentTermsLength > maxLength
                        ? "border-2 border-red-500"
                        : "border border-gray-300 focus:border-indigo-500"
                    }`}
                    name="terms"
                    value={
                      termPolicy && termPolicy.terms ? termPolicy.terms : ""
                    }
                    onChange={(e) =>
                      setTermPolicy({ ...termPolicy, terms: e.target.value })
                    }
                  />
                  <div className={`absolute bottom-3 right-3 text-xs font-medium ${currentTermsLength > maxLength ? "text-red-500" : "text-gray-500"}`}>
                    {currentTermsLength} / {maxLength}
                  </div>
                </div>
              </label>

              {/* Policy Textarea */}
              <label className="block">
                <div className="mb-1 px-1 font-medium ">Policy</div>
                <div className="relative">
                  <textarea
                    className={`h-60 w-full resize-none rounded-lg bg-gray-50 px-3 py-2 text-sm leading-6 outline-none transition duration-150 ${
                      currentPolicyLength > maxLength
                        ? "border-2 border-red-500"
                        : "border border-gray-300 focus:border-indigo-500"
                    }`}
                    name="policy"
                    value={termPolicy?.policy}
                    onChange={(e) =>
                      setTermPolicy({ ...termPolicy, policy: e.target.value })
                    }
                  />
                  <div className={`absolute bottom-3 right-3 text-xs font-medium ${currentPolicyLength > maxLength ? "text-red-500" : "text-gray-500"}`}>
                    {currentPolicyLength} / {maxLength}
                  </div>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                disabled={disabled}
                className={`rounded-lg px-8 py-2 text-base font-medium text-white shadow-md transition duration-150 ${
                  disabled
                    ? "cursor-not-allowed bg-gray-400 opacity-70"
                    : "bg-[#6571FF] hover:bg-[#5661FF]"
                }`}
                onClick={handleUpdateTermsPolicy}
              >
                Save Terms & Policy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Email templates section */}
      <div className="w-full space-y-6">
        <EmailTemplates />
      </div>
    </div>
  );
}
