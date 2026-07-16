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
import {
  Settings2,
  Save,
  Layers,
  DollarSign,
  Info,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

const formatKey = (key: string) =>
  key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

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
  const [price, setPrice] = useState<string>("");
  const [label, setLabel] = useState<string>("Custom Plan");
  const [trialMonths, setTrialMonths] = useState<string>("1");
  const [features, setFeatures] = useState<EditableFeature[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || plans.length === 0) return;
    setSubmitError(null);
    const initialPlanId = currentPlanId || plans[0].id;
    setSelectedPlanId(initialPlanId);
    const plan = plans.find((p) => p.id === initialPlanId) || plans[0];
    setPrice(String(plan.price));
    setLabel(`${plan.name} (Custom)`);
    setTrialMonths(String(plan.trialLengthDays ?? 1));
    setFeatures(
      plan.features.map((f) => ({
        key: f.featureKey,
        type: f.type,
        value: f.value,
      })),
    );
  }, [open, plans, currentPlanId]);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setPrice(String(plan.price));
      setLabel(`${plan.name} (Custom)`);
      setTrialMonths(String(plan.trialLengthDays ?? 1));
      setFeatures(
        plan.features.map((f) => ({
          key: f.featureKey,
          type: f.type,
          value: f.value,
        })),
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
    setSubmitError(null);

    // Validate price
    const parsedPrice = Number(price);
    if (!price || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setSubmitError("Price must be a number greater than zero.");
      return;
    }

    if (!selectedPlanId) {
      setSubmitError("Please select a base plan.");
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
            price: parsedPrice,
            trialLengthDays: Number(trialMonths),
            basePlanId: selectedPlanId,
            features: features.map((f) => ({
              key: f.key,
              type: f.type,
              value: f.value,
            })),
          }),
        });

        if (res.ok) {
          setOpen(false);
        } else {
          const data = await res.json().catch(() => null);
          setSubmitError(data?.message || "Failed to apply custom plan.");
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-[#5a66ee] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-95">
          <Settings2
            size={16}
            className="transition-transform group-hover:rotate-45"
          />
          Configure Plan
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl overflow-hidden rounded-[2.5rem] border-none bg-white/90 dark:bg-slate-950/90 p-0 shadow-2xl backdrop-blur-2xl ring-1 ring-slate-900/5 dark:ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <Layers size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Custom Configuration
              </DialogTitle>
              <p className="text-xs font-medium text-slate-500 tracking-tight">
                Tailoring features for Company #{companyId}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:flex">
            <ShieldCheck size={12} /> Live Sync
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Error Banner */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              {submitError}
            </div>
          )}

          {/* Base Settings Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Base Template
              </label>
              <div className="relative">
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border-none bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Public Label
              </label>
              <Input
                name="CUSTOM LABEL"
                value={label}
                onChange={(e: any) => setLabel(e.target.value)}
                className="h-11 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:ring-slate-800 px-4"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Monthly Rate (USD)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-3 text-slate-400">
                  <DollarSign size={18} />
                </div>
                <Input
                  name="price"
                  type="number"
                  min="0.01"
                  value={price}
                  onChange={(e: any) => {
                    setPrice(e.target.value);
                    setSubmitError(null);
                  }}
                  className="h-11 rounded-xl border-none pl-10 font-bold text-[#00b8b0] ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 dark:ring-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Free Trial (Months)
              </label>
              <Input
                name="trialMonths"
                type="number"
                min="0"
                value={trialMonths}
                onChange={(e: any) => setTrialMonths(e.target.value)}
                className="h-11 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:ring-slate-800 px-4"
              />
            </div>
          </div>

          {/* Feature List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Info size={12} /> Entitlement Overrides
              </h4>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                {features.length} features
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-[1.5rem] border border-slate-200/60 bg-slate-50/50 p-2 dark:border-slate-800/60 dark:bg-slate-900/40 custom-scrollbar overflow-x-hidden">
              {features.map((feature, index) => (
                <div
                  key={`${feature.key}-${index}`}
                  className="group flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                      {formatKey(feature.key)}
                    </p>
                    <p className="text-[10px] font-medium uppercase text-slate-400 tracking-tighter">
                      {feature.type}
                    </p>
                  </div>

                  <div className="w-36 flex-shrink-0">
                    {feature.type === "BOOLEAN" ? (
                      <div className="flex h-9 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
                        {["true", "false"].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleFeatureChange(index, val)}
                            className={`flex-1 rounded-md text-[10px] font-black transition-all ${
                              feature.value === val
                                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                                : "text-slate-500"
                            }`}
                          >
                            {val === "true" ? "ENABLED" : "DISABLED"}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        name="label"
                        value={feature.value}
                        onChange={(e: any) =>
                          handleFeatureChange(index, e.target.value)
                        }
                        className="px-4 w-full h-9 rounded-lg border-none text-right font-mono text-[11px] font-bold text-primary ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:ring-slate-700"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/50 bg-slate-50/50 px-8 py-6 dark:border-slate-800/50 dark:bg-slate-900/50">
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-300"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isPending ? "Syncing..." : "Apply Custom Plan"}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
