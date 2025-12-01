"use client";
import { getCompanyTaxCurrency } from "@/actions/settings/emailTemplates";
import { useEstimateTemplateCreate } from "@/hooks/useEstimateTemplateCreate";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TemplateBillSummary({
  isEstimateTax = true,
  isEstimateServiceFee = true,
}: {
  isEstimateTax?: boolean;
  isEstimateServiceFee?: boolean;
}) {
  const {
    items,
    subtotal,
    discount,
    grandTotal,
    tax,
    serviceFee,
    deposit,
    totalPayment,
  } = useEstimateCreateStore();
  const {
    setSubtotal,
    setDiscount,
    setGrandTotal,
    setTax,
    setDue,
    setServiceFee,
    reset,
  } = useEstimateCreateStore();
  const resetLists = useListsStore((state) => state.reset);
  const createEstimateTemplate = useEstimateTemplateCreate();
  const [isTaxEnabled, setIsTaxEnabled] = useState<boolean>(true);
  const [isSuppliesEnabled, setIsSuppliesEnabled] = useState<boolean>(true);
  const [originalTax, setOriginalTax] = useState(0);
  const [originalServiceFee, setOriginalServiceFee] = useState(0);
  const router = useRouter();

  // Fetch initial tax and service fee values
  useEffect(() => {
    setIsSuppliesEnabled(isEstimateServiceFee);
    setIsTaxEnabled(isEstimateTax);
    async function fetchTaxAndServiceFee() {
      try {
        const taxData = await getCompanyTaxCurrency();
        setOriginalTax(taxData.tax);
        setTax(taxData.tax);

        setOriginalServiceFee(taxData.serviceFee);
        setServiceFee(taxData.serviceFee);
      } catch (error) {
        console.error("Error fetching tax data:", error);
      }
    }
    fetchTaxAndServiceFee();
  }, [setTax, setServiceFee, isEstimateServiceFee, isEstimateTax]);

  // Handle tax and service fee toggle
  useEffect(() => {
    setTax(isTaxEnabled ? originalTax : 0);
    setServiceFee(isSuppliesEnabled ? originalServiceFee : 0);
  }, [
    isTaxEnabled,
    isSuppliesEnabled,
    originalTax,
    originalServiceFee,
    setTax,
    setServiceFee,
  ]);

  // Calculate subtotal and discount from items
  useEffect(() => {
    let newServicesTotal = 0;
    let newDiscountTotal = 0;

    items.forEach((item) => {
      const { service, materials, labor } = item;

      if (!service) return;

      // total material cost
      const materialCost = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.sell
            ? parseFloat(material.sell.toString()) * Number(material.quantity!)
            : 0)
        );
      }, 0);

      // total material discount
      const materialDiscount = materials.reduce((acc, material) => {
        return (
          acc +
          (material && material.discount
            ? parseFloat(material.discount.toString())
            : 0)
        );
      }, 0);

      const laborCost = labor?.charge
        ? Number((Number(labor.charge) * Number(labor.hours)).toFixed(2))
        : 0;

      newServicesTotal += materialCost + laborCost;
      newDiscountTotal +=
        materialDiscount +
        (labor?.discount ? parseFloat(labor.discount.toString()) : 0);
    });

    setSubtotal(newServicesTotal);
    setDiscount(newDiscountTotal);
  }, [items, setSubtotal, setDiscount]);

  // Calculate grand total
  useEffect(() => {
    let netAmount = subtotal - discount;

    let taxAdd = 0;
    let suppliesFeeAdd = 0;
    let newGrandTotal = netAmount;

    if (isTaxEnabled && tax > 0) {
      taxAdd = Number((netAmount * (tax / 100)).toFixed(2));
    }

    if (isSuppliesEnabled && serviceFee > 0) {
      suppliesFeeAdd = Number((netAmount * (serviceFee / 100)).toFixed(2));
    }

    setGrandTotal(Number((newGrandTotal + taxAdd + suppliesFeeAdd).toFixed(2)));
  }, [
    subtotal,
    discount,
    tax,
    serviceFee,
    isTaxEnabled,
    isSuppliesEnabled,
    setGrandTotal,
  ]);

  // Calculate due amount
  useEffect(() => {
    const newDue = grandTotal - (deposit + totalPayment);
    setDue(newDue);
  }, [grandTotal, deposit, totalPayment, setDue]);

  const isGrandTotalZero = grandTotal === 0 ? true : false;

  async function handleSubmit() {
    const res = await createEstimateTemplate();
    if (res.type === "success") {
      router.push("/dashboard/estimate/templates");
      reset();
      resetLists();
    } else if (res.type === "globalError") {
      errorToast(
        res.errorSource?.length ? res.errorSource[0].message : res.message
      );
      return;
    }
  }

  return (
    <>
      <div className="space-y-1 p-1.5">
        {[
          ["subtotal", subtotal.toFixed(2)],
          ["discount", discount.toFixed(2)],
          ["tax", tax.toFixed(2)],
          ["shop supplies", serviceFee.toFixed(2)],
          ["deposit", deposit.toFixed(2)],
          ["payment", totalPayment.toFixed(2)],
          ["grand total", grandTotal.toFixed(2)],
        ].map(([title, data], index) => {
          const isToggleItem = title === "tax" || title === "shop supplies";
          const toggleState =
            title === "tax" ? isTaxEnabled : isSuppliesEnabled;
          const toggleSetter =
            title === "tax" ? setIsTaxEnabled : setIsSuppliesEnabled;
          const originalValue =
            title === "tax" ? originalTax : originalServiceFee;

          return (
            <div
              key={index}
              className="relative flex items-center justify-between gap-4 rounded-md border border-solid border-slate-600 px-2 py-1"
            >
              <div className="mr-auto text-xs uppercase">{title}</div>

              {isToggleItem && (
                <div
                  onClick={() => toggleSetter((prev) => !prev)}
                  className={`ml-2 flex h-5 w-10 cursor-pointer items-center rounded-full px-1 transition-colors ${
                    toggleState ? "bg-[#6571FF]" : "bg-gray-400"
                  }`}
                >
                  <div
                    className={`h-3 w-3 transform rounded-full bg-white transition-transform ${
                      toggleState ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              )}

              <input
                type="text"
                readOnly
                value={
                  isToggleItem
                    ? `${toggleState ? originalValue : 0}%${
                        toggleState && originalValue > 0
                          ? ` | ${(((subtotal - discount) * originalValue) / 100).toFixed(2)}`
                          : ""
                      }`
                    : data
                }
                className="w-[130px] rounded-md bg-slate-500 px-2 py-1 text-right text-xs text-white"
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-md bg-[#006d77] p-2 px-4 py-4 text-sm text-white">
        <button
          type="button"
          className={`w-full rounded-md  p-2  ${isGrandTotalZero ? "cursor-not-allowed bg-gray-500" : "bg-background text-[#006d77]"}`}
          disabled={isGrandTotalZero}
          onClick={handleSubmit}
        >
          Save Template
        </button>
      </div>
    </>
  );
}
