"use client";

import { checkCouponCode } from "@/actions/coupon/checkCouponCode";
import { getCompanyTaxCurrency } from "@/actions/settings/emailTemplates";
import { errorToast, successToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useListsStore } from "@/stores/lists";
import { formatCurrency } from "@/utils/formatCurrency";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import MakePayment from "./MakePayment";
import { cn } from "@/lib/cn";

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
    vehicleExtraCost,
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
  const isEditPage = pathname?.includes("/estimate/edit");
  // On edit pages, skip recalculation until the user actually modifies items.
  // This preserves DB values (e.g. gift card discounts) on first load.
  const initialItemsRef = useRef<string | null>(null);
  const userModifiedItems = useRef(false);
  // Invoice-level discount not derivable from items (e.g. gift card).
  const invoiceLevelDiscountRef = useRef<number>(0);

  // Fetch initial tax and service fee values
  useEffect(() => {
    setIsSuppliesEnabled(isEstimateServiceFee);
    setIsTaxEnabled(isEstimateTax);
    async function fetchTaxAndServiceFee() {
      try {
        const taxData = await getCompanyTaxCurrency();
        setOriginalTax(taxData.tax);
        setOriginalServiceFee(taxData.serviceFee);

        // On edit pages, preserve the invoice's stored tax/serviceFee values
        // instead of overwriting with current company defaults
        if (!isEditPage) {
          setTax(taxData.tax);
          setServiceFee(taxData.serviceFee);
        }
      } catch (error) {
        console.error("Error fetching tax data:", error);
      }
    }
    fetchTaxAndServiceFee();
  }, [setTax, setServiceFee, isEstimateServiceFee, isEstimateTax, isEditPage]);

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
  // On edit pages, preserve the invoice's stored values (e.g. gift card discounts)
  // until the user actually modifies items
  useEffect(() => {
    // Helper: sum item-level discounts from materials and labor
    function calcItemTotals() {
      let servicesTotal = 0;
      let discountTotal = 0;

      items.forEach((item) => {
        const { service, materials, labor } = item;
        if (!service) return;

        const materialCost = materials.reduce((acc, material) => {
          return (
            acc +
            (material && material.sell
              ? parseFloat(material.sell.toString()) *
                Number(material.quantity!)
              : 0)
          );
        }, 0);

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

        servicesTotal += materialCost + laborCost;
        discountTotal +=
          materialDiscount +
          (labor?.discount ? parseFloat(labor.discount.toString()) : 0);
      });

      return { servicesTotal, discountTotal };
    }

    if (isEditPage) {
      if (items.length === 0) {
        return;
      }
      if (initialItemsRef.current === null) {
        // SyncEstimate just populated items — capture snapshot.
        // Calculate the invoice-level discount (e.g. gift card) that isn't
        // represented in item-level discounts so we can preserve it later.
        initialItemsRef.current = JSON.stringify(items);
        const { discountTotal } = calcItemTotals();
        // Read the DB discount from the store (set by SyncEstimate) to compute
        // the invoice-level portion (gift card) not represented in item discounts
        const dbDiscount = useEstimateCreateStore.getState().discount;
        invoiceLevelDiscountRef.current = Math.max(
          0,
          dbDiscount - discountTotal,
        );
        return;
      }
      if (!userModifiedItems.current) {
        if (JSON.stringify(items) === initialItemsRef.current) {
          return;
        }
        userModifiedItems.current = true;
      }
    }

    const { servicesTotal, discountTotal } = calcItemTotals();

    setSubtotal(servicesTotal);
    setDiscount(discountTotal + invoiceLevelDiscountRef.current);
  }, [items, setSubtotal, setDiscount, isEditPage]);

  // Calculate grand total
  useEffect(() => {
    if (isEditPage && !userModifiedItems.current) return;

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

    setGrandTotal(
      Number(
        (newGrandTotal + taxAdd + suppliesFeeAdd + vehicleExtraCost).toFixed(2),
      ),
    );
  }, [
    subtotal,
    discount,
    tax,
    serviceFee,
    vehicleExtraCost,
    isTaxEnabled,
    isSuppliesEnabled,
    setGrandTotal,
    isEditPage,
  ]);

  // Calculate due amount
  useEffect(() => {
    if (isEditPage && !userModifiedItems.current) return;

    const newDue = grandTotal - (deposit + totalPayment);
    setDue(newDue);
  }, [
    grandTotal,
    deposit,
    totalPayment,
    setDue,
    isEstimateServiceFee,
    isEstimateTax,
    isEditPage,
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
            Number(coupon ? coupon.discount : 0),
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
          ["vehicle extra cost", vehicleExtraCost.toFixed(2)],
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
              className="group relative flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition-all hover:border-slate-200 hover:shadow-sm"
            >
              <div className="mr-auto text-sm font-semibold text-slate-500 capitalize">
                {title}
              </div>

              {isToggleItem && (
                <div
                  onClick={() => toggleSetter((prev) => !prev)}
                  className={cn(
                    "relative flex h-5 w-9 cursor-pointer items-center rounded-full px-1 transition-all duration-200",
                    toggleState ? "bg-[#6571FF]" : "bg-slate-200",
                  )}
                >
                  <div
                    className={cn(
                      "h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
                      toggleState ? "translate-x-3.5" : "translate-x-0",
                    )}
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
                          ? ` | $${(((subtotal - discount) * originalValue) / 100).toFixed(2)}`
                          : ""
                      }`
                    : data
                }
                className="w-[200px] rounded-lg bg-gray-500 px-3 py-1 text-right text-sm font-bold text-white ring-1 ring-inset ring-slate-100 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-lg bg-[#006d77] p-5 text-white shadow-xl shadow-[#006d77]/20">
        {/* Total Amount Display */}
        <dl className="flex items-center justify-between border-b border-white/10 pb-4">
          <dt className="font-semibold">Total Due</dt>
          <dd className="text-xl font-semibold">{formatCurrency(due)}</dd>
        </dl>

        {/* Coupon code */}
        {pathname?.includes("/estimate/create") && (
          <div className="group relative flex items-center gap-2 rounded-xl bg-white/10 p-1.5 ring-1 ring-inset ring-white/20 transition-all focus-within:bg-white/15 focus-within:ring-white/40">
            <input
              type="text"
              placeholder="Add Coupon"
              className="w-full bg-transparent px-3 py-1.5 text-sm font-medium text-white placeholder:text-white/50 focus:outline-none"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            {couponLoading ? (
              <div className="px-3">
                <RotatingLines width="20" strokeColor="#fff" />
              </div>
            ) : (
              <button
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-[#006d77] transition-all hover:bg-slate-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={checkCoupon}
                disabled={!client}
                title={!client ? "Please select a client" : undefined}
              >
                Apply
              </button>
            )}
          </div>
        )}

        {/* Payment Action */}
        <div className="pt-2">
          <MakePayment />
          {/* Ensure MakePayment internal button uses:
       w-full bg-white text-[#6571FF] font-bold rounded-xl py-3 shadow-lg
   */}
        </div>
      </div>
    </>
  );
}
