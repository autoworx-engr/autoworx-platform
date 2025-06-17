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

export function BillSummary() {
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
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const pathname = usePathname();

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
  }, [items]);

  useEffect(() => {
    let netAmount = subtotal - discount;

    let newGrandTotal = netAmount;
    if (tax > 0) {
      newGrandTotal += netAmount * (tax / 100);
    }
    if (serviceFee > 0) {
      newGrandTotal += netAmount * (serviceFee / 100);
    }

    setGrandTotal(newGrandTotal);
  }, [subtotal, discount, tax]);

  useEffect(() => {
    const newDue = grandTotal - (deposit + totalPayment);
    setDue(newDue);
  }, [grandTotal, deposit, items]);

  async function checkCoupon() {
    if (!couponInput || !client) return;

    setCouponLoading(true);
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

    setCouponLoading(false);
  }

  useEffect(() => {
    async function fetchTax() {
      const tax = await getCompanyTaxCurrency();
      setTax(tax.tax);
      setServiceFee(tax.serviceFee);
    }

    fetchTax();
  }, [setTax, setServiceFee]);

  return (
    <>
      <div className="space-y-1 p-1.5">
        {[
          ["subtotal", subtotal.toFixed(2)],
          ["discount", discount.toFixed(2)],
          ["tax", tax.toFixed(2)],
          ["service fee", serviceFee.toFixed(2)],
          ["deposit", deposit.toFixed(2)],
          ["grand total", grandTotal.toFixed(2)],
          // ["due", due],
        ].map(([title, data], index) => (
          <div
            key={index}
            className="relative flex items-center rounded-md border border-solid border-slate-600"
          >
            <div className="mr-auto px-2 py-1 text-xs uppercase">
              {title as string}
            </div>

            {title === "tax" || title === "service fee" ? (
              <input
                type="text"
                value={`${Number(data)}%${
                  Number(data) !== 0
                    ? ` | ${((subtotal as any) * Number(data)) / 100}`
                    : ""
                }`}
                className="w-[100px] rounded-md bg-slate-500 px-2 py-1 text-xs text-white"
                readOnly
              />
            ) : (
              <input
                type="text"
                value={data as string}
                className="w-[100px] rounded-md bg-slate-500 px-2 py-1 text-xs text-white"
                readOnly
              />
            )}
          </div>
        ))}
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
              <>
                <RotatingLines width="24" strokeColor="#fff" />
              </>
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
