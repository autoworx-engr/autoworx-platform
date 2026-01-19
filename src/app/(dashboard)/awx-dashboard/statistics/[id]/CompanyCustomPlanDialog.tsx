"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import Input from "@/components/Input";
import { PlatformFeatureType, PlatformPlan, PlanFeature } from "@prisma/client";

export type PlatformPlanWithFeatures = PlatformPlan & {
  features: PlanFeature[];
};

type Props = {
  companyId: number;
  currentPlanId: string | null;
  plans: PlatformPlanWithFeatures[];
};

type EditableFeature = {
  key: string;
  type: PlatformFeatureType;
  value: string;
};

export function CompanyCustomPlanDialog({
  companyId,
  currentPlanId,
  plans,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const [price, setPrice] = useState<string>("");
  const [label, setLabel] = useState<string>("Custom Plan");
  const [features, setFeatures] = useState<EditableFeature[]>([]);

  // Whenever dialog opens, initialize with current plan or first available plan
  useEffect(() => {
    if (!open || plans.length === 0) return;

    const initialPlanId = currentPlanId || plans[0].id;
    setSelectedPlanId(initialPlanId);

    const plan = plans.find((p) => p.id === initialPlanId) || plans[0];
    setPrice(String(plan.price));
    setLabel(`${plan.name} (Custom)`);
    setFeatures(
      plan.features.map((f) => ({
        key: f.featureKey,
        type: f.type,
        value: f.value,
      }))
    );
  }, [open, plans, currentPlanId]);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setPrice(String(plan.price));
      setLabel(`${plan.name} (Custom)`);
      setFeatures(
        plan.features.map((f) => ({
          key: f.featureKey,
          type: f.type,
          value: f.value,
        }))
      );
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const handleSubmit = () => {
    if (!selectedPlanId) {
      console.error("Please select a base plan");
      return;
    }

    const numericPrice = Number(price);
    if (!numericPrice || numericPrice <= 0) {
      console.error("Price must be greater than zero");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/awx/custom-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            label,
            price: numericPrice,
            basePlanId: selectedPlanId,
            features: features.map((f) => ({
              key: f.key,
              type: f.type,
              value: f.value,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.message || "Failed to create custom plan");
        }
        setOpen(false);
      } catch (error: any) {
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#6571FF] to-[#5a66ee] shadow-[0_4px_14px_0_rgba(101,113,255,0.39)] hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-100 transition-all duration-300 ease-in-out"
          type="button"
        >
          Configure Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-800">
            Configure Custom Plan
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-5">
          <p className="text-xs text-slate-500">
            Start from an existing package, then fine-tune price and feature
            limits for this specific shop.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Base plan template
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Plan display name
              </label>
              <Input
                name="custom_label"
                value={label}
                onChange={(e: any) => setLabel(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Monthly price (USD)
              </label>
              <Input
                name="custom_price"
                type="number"
                value={price}
                onChange={(e: any) => setPrice(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div className="mt-1 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Feature limits & toggles
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {features.length} items
              </span>
            </div>
            {features.length === 0 && (
              <p className="text-xs text-slate-500">
                No features defined for this plan.
              </p>
            )}
            {features.map((feature, index) => (
              <div
                key={`${feature.key}-${index}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-700">
                    {feature.key}
                  </div>
                  <div className="text-[11px] uppercase text-slate-400">
                    {feature.type}
                  </div>
                </div>
                <div className="w-32">
                  {feature.type === "BOOLEAN" ? (
                    <select
                      value={feature.value === "true" ? "true" : "false"}
                      onChange={(e) =>
                        handleFeatureChange(index, e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <Input
                      name={feature.key}
                      value={feature.value}
                      onChange={(e: any) =>
                        handleFeatureChange(index, e.target.value)
                      }
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-9 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="h-9 px-4 text-xs font-semibold"
            >
              {isPending ? "Saving..." : "Save Custom Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
