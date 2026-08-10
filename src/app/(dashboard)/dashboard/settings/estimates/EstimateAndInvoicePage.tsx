"use client";
import {
  getCompanyTermsAndPolicyTax,
  updateTaxCurrency,
  updateTermsPolicy,
} from "@/actions/settings/emailTemplates";
import Selector from "@/components/Selector";
import { SlimInput } from "@/components/SlimInput";
import { CURRENCIES } from "@/lib/currencies";
import { errorToast, successToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "antd";
import { DollarSign, FileText, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import EmailTemplates from "./EmailTemplates";

export default function EstimateAndInvoicePage() {
  const [currency, setCurrency] = useState<string>("USD");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const maxLength = 800;
  const [termPolicy, setTermPolicy] = useState<{
    terms?: string;
    policy?: string;
  }>({});

  const [tax, setTax] = useState<string>("0");
  const [serviceFee, setServiceFee] = useState<string>("0");
  const [disabled, setDisabled] = useState(false);
  const [isSavingFinancials, setIsSavingFinancials] = useState(false);
  const [isSavingDocuments, setIsSavingDocuments] = useState(false);

  const currentTermsLength = termPolicy?.terms?.length ?? 0;
  const currentPolicyLength = termPolicy?.policy?.length ?? 0;

  useEffect(() => {
    setDisabled(
      currentTermsLength > maxLength || currentPolicyLength > maxLength,
    );
  }, [currentTermsLength, currentPolicyLength]);

  useEffect(() => {
    const fetchTermsPolicy = async () => {
      try {
        const data = await getCompanyTermsAndPolicyTax();
        setTermPolicy(data);
        setTax(String(data.tax));
        setServiceFee(String(data.serviceFee));
        setCurrency(data.currency);
      } catch (_error) {
        errorToast("Failed to load settings");
      }
    };

    const loadPageData = async () => {
      setIsLoading(true);
      try {
        await fetchTermsPolicy();
      } catch (_error) {
        errorToast("Failed to load page data");
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, []);

  const handleUpdateTermsPolicy = async () => {
    setIsSavingDocuments(true);
    try {
      const res = await updateTermsPolicy({
        terms: termPolicy.terms?.trim() || "",
        policy: termPolicy.policy?.trim() || "",
      });
      if (res?.success) successToast("Terms & Policy updated successfully");
    } catch {
      errorToast("Failed to update terms and policy");
    } finally {
      setIsSavingDocuments(false);
    }
  };

  const handleUpdateCurrency = async () => {
    setIsSavingFinancials(true);
    try {
      const validTax = tax && !isNaN(Number(tax)) ? tax : "0";
      const validServiceFee =
        serviceFee && !isNaN(Number(serviceFee)) ? serviceFee : "0";
      await updateTaxCurrency({
        currency,
        tax: validTax,
        serviceFee: validServiceFee,
      });
      successToast("Financial settings updated successfully");
    } catch {
      errorToast("Failed to update financial settings");
    } finally {
      setIsSavingFinancials(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-1 items-start gap-8 bg-slate-50/30 md:grid-cols-2">
      {/* LEFT COLUMN */}
      <div className="space-y-8">
        {/* FINANCIALS CARD */}
        <section className="group relative rounded-xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                <DollarSign size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-600">Financials</h2>
                <p className="text-sm font-medium text-slate-400">
                  Tax, Service Fee & Currency
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`financial-skeleton-${index + 1}`}
                      className="space-y-2"
                    >
                      <Skeleton.Input active className="!h-4 !w-24" />
                      <Skeleton.Input active className="!h-10 !w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4">
                  <Skeleton.Button active className="!h-10 !w-36" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2">
                  <div className="relative">
                    <SlimInput
                      name="taxAmount"
                      value={tax}
                      label="Tax Rate"
                      className="w-full"
                      onChange={(e) =>
                        /^\d*\.?\d*$/.test(e.target.value) &&
                        setTax(e.target.value)
                      }
                    />
                    <Percent
                      size={14}
                      className="absolute bottom-3 right-3 text-slate-500 transition-colors group-focus-within:text-primary"
                    />
                  </div>

                  <div className="relative group">
                    <SlimInput
                      name="serviceFee"
                      value={serviceFee}
                      label="Shop Supplies"
                      className="w-full"
                      onChange={(e) =>
                        /^\d*\.?\d*$/.test(e.target.value) &&
                        setServiceFee(e.target.value)
                      }
                    />
                    <Percent
                      size={14}
                      className="absolute bottom-3 right-3 text-slate-500 transition-colors group-focus-within:text-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-1 2xl:col-span-2">
                    <label className="px-1 font-medium text-slate-600">
                      Currency
                    </label>
                    <Selector
                      className="w-full"
                      items={CURRENCIES}
                      selectedItem={CURRENCIES.find(
                        (c) => c.value === currency,
                      )}
                      label={(item) => item?.label || "Select currency"}
                      displayList={(item) => (
                        <div className="flex items-center justify-between text-sm text-slate-700">
                          <span>{item.label}</span>
                          <span className="text-xs text-slate-400">
                            {item.value}
                          </span>
                        </div>
                      )}
                      onSearch={(term) =>
                        CURRENCIES.filter((c) =>
                          `${c.label} ${c.value}`
                            .toLowerCase()
                            .includes(term.toLowerCase()),
                        )
                      }
                      onSelect={(item) => setCurrency(item.value)}
                      newButton={
                        <div className="px-2 text-xs text-slate-400">
                          Select a currency
                        </div>
                      }
                      border
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    disabled={isSavingFinancials}
                    onClick={handleUpdateCurrency}
                    className="group relative overflow-hidden rounded-xl bg-primary px-6 py-2 font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">
                      {isSavingFinancials ? "Saving..." : "Save Financials"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* TERMS & POLICY CARD */}
        <section className="rounded-xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all duration-300">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-600">
                Legal Agreements
              </h2>
              <p className="text-sm font-medium text-slate-400">
                Customer terms and privacy policies
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-1 2xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={`legal-skeleton-${index + 1}`} className="space-y-3">
                  <Skeleton.Input active className="!h-4 !w-32" />
                  <Skeleton.Input
                    active
                    className="!h-64 !w-full !rounded-2xl"
                  />
                  <div className="flex justify-end">
                    <Skeleton.Input active className="!h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-1 2xl:grid-cols-2">
              {[
                {
                  label: "Terms & Conditions",
                  val: termPolicy.terms,
                  key: "terms",
                  len: currentTermsLength,
                },
                {
                  label: "Privacy Policy",
                  val: termPolicy.policy,
                  key: "policy",
                  len: currentPolicyLength,
                },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="font-medium text-slate-500">
                      {field.label}
                    </label>
                  </div>
                  <div className="relative group">
                    <textarea
                      className={cn(
                        "h-48 2xl:h-64 w-full resize-none rounded-2xl bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-600 outline-none transition-all thin-scrollbar focus:bg-white focus:ring-4 focus:ring-primary/5",
                        field.len > maxLength
                          ? "border-2 border-red-400"
                          : "border border-slate-200 focus:border-primary/30",
                      )}
                      value={field.val || ""}
                      onChange={(e) =>
                        setTermPolicy({
                          ...termPolicy,
                          [field.key]: e.target.value,
                        })
                      }
                    />
                    <div
                      className={cn(
                        "absolute -bottom-5 right-2 rounded-lg px-2 py-1 text-[10px] font-bold shadow-sm",
                        field.len > maxLength
                          ? "bg-red-50 text-red-500"
                          : "bg-white text-slate-400",
                      )}
                    >
                      {field.len} / {maxLength}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-8">
            <button
              disabled={disabled || isLoading || isSavingDocuments}
              onClick={handleUpdateTermsPolicy}
              className={cn(
                "group relative overflow-hidden rounded-xl px-6 py-2 font-medium text-white transition-all",
                disabled || isLoading || isSavingDocuments
                  ? "bg-slate-200 cursor-not-allowed opacity-50"
                  : "bg-primary",
              )}
            >
              <span className="relative z-10">
                {isSavingDocuments ? "Saving..." : "Update Documents"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN */}
      <div className="sticky top-6 hidden md:block">
        {isLoading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : (
          <EmailTemplates />
        )}
      </div>
      <div className="md:hidden">
        {isLoading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <EmailTemplates />
        )}
      </div>
    </div>
  );
}
