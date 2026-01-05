"use client";

import { checkCouponCode } from "@/actions/coupon/checkCouponCode";
import { getCompanyTaxCurrency } from "@/actions/settings/emailTemplates";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import MakePayment from "./MakePayment";

export function BillSummary({
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
    due,
    deposit,
    coupon,
    totalPayment,
  } = useEstimateCreateStore();
  const {
    setSubtotal,
    setDiscount,
    setGrandTotal,
    setTax,
    setDue,
    setCoupon,
    setServiceFee,
  } = useEstimateCreateStore();

  const { client } = useListsStore();
  const [isTaxEnabled, setIsTaxEnabled] = useState<boolean>(true);
  const [isSuppliesEnabled, setIsSuppliesEnabled] = useState<boolean>(true);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [originalTax, setOriginalTax] = useState(0);
  const [originalServiceFee, setOriginalServiceFee] = useState(0);
  const pathname = usePathname();

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
  }, [
    grandTotal,
    deposit,
    totalPayment,
    setDue,
    isEstimateServiceFee,
    isEstimateTax,
  ]);

  async function checkCoupon() {
    if (!couponInput || !client) return;

    setCouponLoading(true);
    try {
      const res = await checkCouponCode({
        code: couponInput,
        clientId: client?.id,
      });

      if (res.type === "success") {
        successToast("Coupon applied successfully");
        setCoupon(res.data);
        setDiscount(
          Number(discount) +
            Number(res.data.discount) -
            Number(coupon ? coupon.discount : 0)
        );
      } else {
        errorToast(res.message!);
      }
    } catch (error) {
      errorToast("Failed to apply coupon");
    }
    setCouponLoading(false);
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

      <div className="space-y-2 rounded-md bg-[#006d77] p-2 px-4 pb-4 text-sm text-white">
        <dl className="flex justify-between">
          <dt>Due</dt> <dd>{formatCurrency(due)}</dd>
        </dl>

        {/* Coupon code */}
        {pathname?.includes("/estimate/create") && (
          <div className="flex justify-between rounded-md border p-1">
            <input
              type="text"
              placeholder="Add Coupon"
              className="w-full bg-transparent p-2 focus:outline-none"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            {couponLoading ? (
              <RotatingLines width="24" strokeColor="#fff" />
            ) : (
              <button
                className="rounded-md p-2 transition-colors hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                onClick={checkCoupon}
                disabled={!client}
                title={!client ? "Please select a client" : undefined}
              >
                Apply
              </button>
            )}
          </div>
        )}
        <MakePayment />
      </div>
    </>
  );
}
