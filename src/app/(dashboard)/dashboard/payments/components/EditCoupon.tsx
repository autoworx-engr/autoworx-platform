"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import CouponDateComponent from "./CouponDatePicker";

import { updateCoupon } from "@/actions/coupon/new";
import { useFormErrorStore } from "@/stores/form-error";
import { Coupon } from "@prisma/client";
import { useState } from "react";
import { CouponCode, DiscountInput } from "./CodeDiscount";

export default function EditCoupon({
  coupon,
  onUpdate,
  onClose,
}: {
  coupon: Coupon;
  onUpdate: (updatedCoupon: Coupon) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);
  const { showError, clearError } = useFormErrorStore();

  // Add state for date validation
  const [startDate, setStartDate] = useState(
    coupon.startDate.toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    coupon.endDate.toISOString().split("T")[0],
  );

  async function handleSubmit(data: FormData) {
    const couponName = data.get("couponName");
    const couponCode = data.get("couponCode");
    const couponType = data.get("couponType");
    const discountType = data.get("discountType");
    const discountValue = data.get("discountValue");
    const startDate = data.get("startDate");
    const endDate = data.get("endDate");

    const res = await updateCoupon({
      id: coupon.id,
      couponName: couponName as string,
      couponCode: couponCode as string,
      discountType: discountType as string,
      discountValue: parseFloat(Number(discountValue).toFixed(2)),
      startDate: startDate as string,
      endDate: endDate as string,
      couponType: couponType as string,
    });
    if (res.type === "success") {
      setOpen(false);
      onUpdate(res.data);
      onClose();
      clearError();
    } else if (res.type === "globalError") {
      showError({
        field: res.field,
        message:
          res.errorSource && res.errorSource.length > 0
            ? res.errorSource[0].message
            : res.message,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-h-full max-w-xl grid-rows-[auto,1fr,auto]"
        form
      >
        <DialogHeader>
          <DialogTitle>Edit Coupon</DialogTitle>
        </DialogHeader>

        <FormError />

        <div className="grid gap-5 overflow-y-auto p-4">
          <SlimInput
            name="couponName"
            label="Coupon Name"
            defaultValue={coupon.name}
          />
          <CouponCode defaultValue={coupon.code} />
          <SlimInput
            name="couponType"
            label="Coupon Type"
            style={{ width: "300px" }}
            defaultValue={coupon.type}
          />

          <div className="flex items-center gap-4">
            <CouponDateComponent
              customTitle="Start Date"
              name="startDate"
              defaultValue={coupon.startDate}
              otherDate={endDate}
              isStartDate={true}
              onDateChange={(date) => setStartDate(date)}
            />
            <CouponDateComponent
              customTitle="End Date"
              name="endDate"
              defaultValue={coupon.endDate}
              otherDate={startDate}
              isStartDate={false}
              onDateChange={(date) => setEndDate(date)}
            />
          </div>

          <div>
            <DiscountInput
              defaultDiscountType={coupon.discountType}
              defaultDiscountValue={coupon.discount.toString()}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
            Cancel
          </DialogClose>
          <Submit
            className="mb-2 rounded-lg border bg-primary px-5 py-2 text-white md:mb-0"
            formAction={handleSubmit}
          >
            Update
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
